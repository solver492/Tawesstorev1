import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createClient } from './supabase.js';
import { uploadVideo, vimeoEmbedUrl, vimeoPageUrl, isVimeoConfigured } from './vimeo.js';

const PORT = Number(process.env.PORT || 4000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';
const MARGIN_DH = Number(process.env.MARGIN_DH || 10);
const APP_ORIGIN = process.env.ADMIN_ALLOWED_ORIGIN || '*';

const db = createClient();
const app = express();
app.use(cors({ origin: APP_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

const signer = () => crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');
const safeEqual = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

app.post('/api/login', (req, res) => {
  if (!safeEqual(req.body?.password ?? '', ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }
  res.cookie('admin_session', signer(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 3600 * 1000,
  });
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('admin_session');
  res.json({ ok: true });
});

app.get('/api/session', (req, res) => {
  res.json({
    authenticated: safeEqual(req.cookies?.admin_session ?? '', signer()),
    vimeoConfigured: isVimeoConfigured(),
    marginDh: MARGIN_DH,
  });
});

app.use('/api', (req, res, next) => {
  if (req.path === '/session') return next();
  if (!safeEqual(req.cookies?.admin_session ?? '', signer())) {
    return res.status(401).json({ error: 'Non authentifie' });
  }
  next();
});

const wrap = (fn) => (req, res) => fn(req, res).catch((err) => res.status(400).json({ error: err.message }));

// ---------- Stats ----------
app.get(
  '/api/stats',
  wrap(async (_req, res) => {
    const [pending, published, drafts, categories] = await Promise.all([
      db.count('telegram_messages', { processed: 'eq.false' }),
      db.count('products', { is_published_to_website: 'eq.true' }),
      db.count('products', { status: 'eq.pending' }),
      db.count('categories', { is_active: 'eq.true' }),
    ]);
    res.json({ pending, published, drafts, categories });
  }),
);

// ---------- File d'attente ----------
app.get(
  '/api/pending',
  wrap(async (_req, res) => {
    const rows = await db.select('telegram_messages', {
      processed: 'eq.false',
      order: 'message_date.desc',
      limit: '200',
    });
    res.json(rows.map(shapePending));
  }),
);

const shapePending = (row) => {
  const payload = row.raw_payload || {};
  return {
    id: row.id,
    channel: row.channel_name,
    channelId: row.channel_id,
    messageDate: row.message_date,
    messageText: row.message_text,
    telegramMessageId: row.telegram_message_id,
    kind: payload.kind || 'photo',
    extraction: payload.extraction || {},
    media: payload.media || [],
    productId: payload.product_id ?? null,
  };
};

app.patch(
  '/api/pending/:id',
  wrap(async (req, res) => {
    const [row] = await db.select('telegram_messages', { id: `eq.${req.params.id}` });
    if (!row) return res.status(404).json({ error: 'Publication introuvable' });
    const merged = {
      ...(row.raw_payload || {}),
      extraction: { ...(row.raw_payload?.extraction || {}), ...(req.body.extraction || {}) },
    };
    const [updated] = await db.update('telegram_messages', { id: `eq.${req.params.id}` }, {
      raw_payload: merged,
    });
    res.json(shapePending(updated));
  }),
);

app.delete(
  '/api/pending/:id',
  wrap(async (req, res) => {
    await db.update('telegram_messages', { id: `eq.${req.params.id}` }, {
      processed: true,
      raw_payload: { rejected: true, reason: req.body?.reason || 'rejete manuellement' },
    });
    res.json({ ok: true });
  }),
);

app.post(
  '/api/pending/:id/publish',
  wrap(async (req, res) => {
    const [row] = await db.select('telegram_messages', { id: `eq.${req.params.id}` });
    if (!row) throw new Error('Publication introuvable');

    const draft = { ...(row.raw_payload?.extraction || {}), ...(req.body.extraction || {}) };
    const categoryId = req.body.category_id || null;
    const wholesale = num(req.body.wholesale_price ?? draft.wholesalePrice);
    const sale = num(req.body.suggested_sale_price ?? wholesale + MARGIN_DH);

    if (!draft.name) throw new Error('Le nom du produit est obligatoire');
    if (wholesale == null) throw new Error('Le prix de gros est obligatoire');
    if (sale == null) throw new Error('Le prix de vente est obligatoire');

    const category = categoryId
      ? (await db.select('categories', { id: `eq.${categoryId}` }))[0]
      : null;
    const supplierId = await resolveSupplier(row);

    const [product] = await db.insert('products', {
      supplier_id: supplierId,
      name: draft.name,
      description: draft.description || '',
      category_id: categoryId,
      category_name: category?.name || null,
      category: category?.name || null,
      wholesale_price: wholesale,
      suggested_sale_price: sale,
      is_lot: Boolean(draft.isLot),
      lot_quantity: draft.lotQuantity ?? null,
      lot_unit_price: draft.lotQuantity ? round2(wholesale / draft.lotQuantity) : null,
      lot_total_price: draft.isLot ? wholesale : null,
      lot_label: draft.isLot ? `Lot de ${draft.lotQuantity}` : null,
      stock: draft.lotQuantity ?? null,
      source_message_id: row.telegram_message_id,
      source_channel_id: row.channel_name,
      status: 'published',
      active: true,
      is_published_to_website: true,
    });

    const media = await attachMedia(product.id, row.raw_payload?.media || [], req.body);
    if (media.length) {
      await db.update('products', { id: `eq.${product.id}` }, {
        images: media.filter((m) => m.media_type === 'image').map((m) => m.media_url),
        image_url: media.find((m) => m.media_type === 'image')?.media_url || null,
      });
    }

    await db.update('telegram_messages', { id: `eq.${row.id}` }, {
      processed: true,
      product_id: product.id,
      raw_payload: { ...(row.raw_payload || {}), product_id: product.id, published_at: new Date().toISOString() },
    });

    res.json({ productId: product.id, media: media.length });
  }),
);

// ---------- Produits ----------
app.get(
  '/api/products',
  wrap(async (req, res) => {
    const filters = { order: 'created_at.desc', limit: String(req.query.limit || 300) };
    if (req.query.status) filters.status = `eq.${req.query.status}`;
    if (req.query.category_id) filters.category_id = `eq.${req.query.category_id}`;
    res.json(await db.select('products_with_category', filters));
  }),
);

app.patch(
  '/api/products/:id',
  wrap(async (req, res) => {
    const patch = { ...req.body };
    delete patch.id;
    delete patch.category_id_name;
    if (req.body.category_id !== undefined) {
      const cat = (await db.select('categories', { id: `eq.${req.body.category_id}` }))[0];
      patch.category_name = cat?.name || null;
      patch.category = cat?.name || null;
    }
    if (patch.suggested_sale_price !== undefined) patch.suggested_sale_price = num(patch.suggested_sale_price);
    if (patch.wholesale_price !== undefined) patch.wholesale_price = num(patch.wholesale_price);
    const [updated] = await db.update('products', { id: `eq.${req.params.id}` }, patch);
    res.json(updated);
  }),
);

app.post(
  '/api/products/:id/publish',
  wrap(async (req, res) => {
    const on = req.body.published !== false;
    const [updated] = await db.update('products', { id: `eq.${req.params.id}` }, {
      is_published_to_website: on,
      status: on ? 'published' : 'draft',
    });
    res.json(updated);
  }),
);

app.post(
  '/api/products/:id/validate',
  wrap(async (req, res) => {
    const [updated] = await db.update('products', { id: `eq.${req.params.id}` }, {
      status: 'published',
      is_published_to_website: true,
      active: true,
    });
    res.json(updated);
  }),
);

app.post(
  '/api/products/bulk-category',
  wrap(async (req, res) => {
    const ids = req.body.ids || [];
    const cat = (await db.select('categories', { id: `eq.${req.body.category_id}` }))[0];
    if (!cat) throw new Error('Categorie introuvable');
    await Promise.all(
      ids.map((id) =>
        db.update('products', { id: `eq.${id}` }, {
          category_id: cat.id,
          category_name: cat.name,
          category: cat.name,
        }),
      ),
    );
    res.json({ updated: ids.length });
  }),
);

app.delete(
  '/api/products/:id',
  wrap(async (req, res) => {
    await db.remove('product_media', { product_id: `eq.${req.params.id}` });
    await db.remove('products', { id: `eq.${req.params.id}` });
    res.json({ ok: true });
  }),
);

// ---------- Medias / carousel / video ----------
app.get(
  '/api/products/:id/media',
  wrap(async (req, res) => {
    res.json(await db.select('product_media', {
      product_id: `eq.${req.params.id}`,
      order: 'sort_order.asc',
    }));
  }),
);

app.post(
  '/api/products/:id/media',
  wrap(async (req, res) => {
    const existing = await db.select('product_media', { product_id: `eq.${req.params.id}` });
    const [row] = await db.insert('product_media', {
      product_id: Number(req.params.id),
      media_url: req.body.url,
      media_type: req.body.media_type || 'image',
      alt_text: req.body.alt_text || null,
      sort_order: req.body.sort_order ?? existing.length,
    });
    await syncProductImages(req.params.id);
    res.json(row);
  }),
);

app.post(
  '/api/products/:id/media/upload',
  express.raw({ type: ['image/*', 'video/*'], limit: '200mb' }),
  wrap(async (req, res) => {
    const productId = Number(req.params.id);
    const ext = (req.get('x-file-name') || 'image.jpg').split('.').pop().split('?')[0];
    const existing = await db.select('product_media', { product_id: `eq.${productId}` });
    const { publicUrl } = await db.upload(
      `products/${productId}/${Date.now()}.${ext}`,
      req.body,
      req.get('content-type'),
    );
    const [row] = await db.insert('product_media', {
      product_id: productId,
      media_url: publicUrl,
      media_type: req.get('content-type').startsWith('video') ? 'video' : 'image',
      sort_order: existing.length,
    });
    await syncProductImages(productId);
    res.json(row);
  }),
);

app.delete(
  '/api/media/:id',
  wrap(async (req, res) => {
    const [row] = await db.select('product_media', { id: `eq.${req.params.id}` });
    if (!row) throw new Error('Media introuvable');
    await db.remove('product_media', { id: `eq.${req.params.id}` });
    await syncProductImages(row.product_id);
    res.json({ ok: true });
  }),
);

app.post(
  '/api/products/:id/video',
  wrap(async (req, res) => {
    const productId = Number(req.params.id);
    const sourceUrl = req.body.url;
    if (!sourceUrl) throw new Error('URL de la video source requise');

    const res0 = await fetch(sourceUrl);
    if (!res0.ok) throw new Error(`Telechargement impossible (${res0.status})`);
    const buffer = Buffer.from(await res0.arrayBuffer());
    const name = req.body.name || `produit-${productId}.mp4`;

    const vimeo = await uploadVideo({ buffer, fileName: name, name: req.body.title || name });
    const [row] = await db.insert('product_media', {
      product_id: productId,
      media_url: vimeo.embedUrl,
      media_type: 'vimeo',
      alt_text: vimeo.videoId,
      sort_order: req.body.sort_order ?? 0,
    });

    const hasVideo = await db.count('product_media', { product_id: `eq.${productId}`, media_type: 'eq.vimeo' });
    await db.update('products', { id: `eq.${productId}` }, {
      status: hasVideo ? 'pending' : 'published',
    });

    res.json({ ...vimeo, media: row });
  }),
);

// ---------- Categories ----------
app.get(
  '/api/categories',
  wrap(async (_req, res) => {
    res.json(await db.select('categories', { order: 'display_order.asc' }));
  }),
);

app.patch(
  '/api/categories/:id',
  wrap(async (req, res) => {
    const [updated] = await db.update('categories', { id: `eq.${req.params.id}` }, req.body);
    res.json(updated);
  }),
);

// ---------- helpers ----------
async function attachMedia(productId, staging = [], overrides = {}) {
  const extra = overrides.extra_images || [];
  const rows = [];

  for (const [index, item] of staging.entries()) {
    if (item.kind !== 'photo' || !item.url) continue;
    try {
      const file = await fetch(item.url);
      if (!file.ok) continue;
      const ext = (item.file_name || 'photo.jpg').split('.').pop().split('?')[0];
      const { publicUrl } = await db.upload(
        `products/${productId}/${String(index + 1).padStart(2, '0')}.${ext}`,
        Buffer.from(await file.arrayBuffer()),
        item.content_type || 'image/jpeg',
      );
      const [row] = await db.insert('product_media', {
        product_id: productId,
        media_url: publicUrl,
        media_type: 'image',
        alt_text: item.ocr || null,
        sort_order: index,
      });
      rows.push(row);
    } catch {
      /* une image qui echoue ne doit pas bloquer la publication */
    }
  }

  for (const [offset, url] of extra.entries()) {
    const [row] = await db.insert('product_media', {
      product_id: productId,
      media_url: url,
      media_type: 'image',
      sort_order: staging.length + offset,
    });
    rows.push(row);
  }

  return rows;
}

async function syncProductImages(productId) {
  const media = await db.select('product_media', {
    product_id: `eq.${productId}`,
    order: 'sort_order.asc',
  });
  const images = media.filter((m) => m.media_type === 'image').map((m) => m.media_url);
  await db.update('products', { id: `eq.${productId}` }, {
    images,
    image_url: images[0] || null,
  });
  return media;
}

async function resolveSupplier(row) {
  if (row.supplier_id) {
    const [found] = await db.select('suppliers', { id: `eq.${row.supplier_id}` });
    if (found) return found.id;
  }
  const name = row.channel_name || 'Telegram';
  const [existing] = await db.select('suppliers', { name: `eq.${name}` });
  if (existing) return existing.id;
  const [created] = await db.insert('suppliers', { name, active: true });
  return created?.id ?? null;
}

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const round2 = (n) => Math.round(n * 100) / 100;

// Le dossier public est a la racine du paquet, a cote de src/.
const publicDir = new URL('../public', import.meta.url).pathname;

app.use(express.static(publicDir));
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(`${publicDir}/index.html`);
});

app.listen(PORT, () => {
  console.log(`[admin] http://127.0.0.1:${PORT} — marge ${MARGIN_DH} DH, vimeo ${isVimeoConfigured() ? 'actif' : 'NON configure'}`);
});

export { vimeoEmbedUrl, vimeoPageUrl };
