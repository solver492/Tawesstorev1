const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const state = { pending: [], products: [], categories: [], media: new Map(), selected: new Set() };

async function api(path, { method = 'GET', body, raw } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: raw ? {} : body ? { 'Content-Type': 'application/json' } : {},
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  if (res.status === 401) return showLogin();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

function toast(message, kind = 'ok') {
  const el = $('#toast');
  el.textContent = message;
  el.className = `toast toast-${kind}`;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), 4000);
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- login ----------
async function boot() {
  const session = await fetch('/api/session', { credentials: 'same-origin' }).then((r) => r.json());
  if (session.authenticated) showApp(session);
  else showLogin();
}

function showLogin() {
  $('#app').hidden = true;
  $('#login').hidden = false;
}

function showApp(session) {
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#vimeo-state').textContent = session.vimeoConfigured ? 'Vimeo actif' : 'Vimeo non configure';
  $('#vimeo-state').className = `pill ${session.vimeoConfigured ? 'pill-ok' : 'pill-warn'}`;
  loadAll();
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').textContent = '';
  try {
    await api('/login', { method: 'POST', body: { password: $('#password').value } });
    boot();
  } catch (err) {
    $('#login-error').textContent = err.message;
  }
});

$('#logout').addEventListener('click', async () => {
  await api('/logout', { method: 'POST' });
  showLogin();
});

$$('.tabs button').forEach((btn) =>
  btn.addEventListener('click', () => {
    $$('.tabs button').forEach((b) => b.classList.toggle('active', b === btn));
    $$('.tab').forEach((t) => t.classList.toggle('active', t.id === `tab-${btn.dataset.tab}`));
  }),
);

async function loadAll() {
  await Promise.all([loadPending(), loadProducts(), loadCategories()]);
  const stats = await api('/stats');
  $('#badge-pending').textContent = stats.pending;
}

// ---------- file d'attente ----------
async function loadPending() {
  state.pending = await api('/pending');
  renderPending();
}

function renderPending() {
  const list = $('#pending-list');
  if (!state.pending.length) {
    list.innerHTML = '<p class="empty">Aucune publication en attente. Relis les canaux pour en alimenter.</p>';
    return;
  }
  list.innerHTML = state.pending.map(card).join('');
}

function card(item) {
  const ex = item.extraction || {};
  const images = (item.media || []).filter((m) => m.kind !== 'video');
  const video = (item.media || []).find((m) => m.kind === 'video');
  const reasons = (ex.reasons || []).join(', ');

  return `
  <article class="card pending-card" data-id="${item.id}">
    <header class="pending-head">
      <div>
        <strong>${esc(item.channel)}</strong>
        <span class="muted small"> · ${new Date(item.messageDate).toLocaleString('fr-FR')}</span>
      </div>
      <span class="pill ${ex.publishable ? 'pill-ok' : 'pill-warn'}">${ex.publishable ? 'complet' : 'a completer'}</span>
    </header>

    <div class="pending-body">
      <div class="previews">
        ${images.map((m) => `<img src="${esc(m.url)}" alt="" loading="lazy" />`).join('')}
        ${video ? '<div class="video-chip">video</div>' : ''}
      </div>
      <div class="pending-fields">
        <label>Nom<input data-f="name" value="${esc(ex.name || '')}" placeholder="Nom du produit" /></label>
        <div class="row">
          <label>Gros (DH)<input data-f="wholesalePrice" type="number" step="0.01" value="${ex.wholesalePrice ?? ''}" /></label>
          <label>Vente (DH)<input data-f="sale" type="number" step="0.01" placeholder="auto = gros + marge" /></label>
        </div>
        <label>Categorie
          <select data-f="category_id">
            <option value="">— non categorise —</option>
            ${state.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
          </select>
        </label>
        <label>Description<textarea data-f="description" rows="2">${esc(ex.description || '')}</textarea></label>
        ${reasons ? `<p class="muted small">Manque : ${esc(reasons)}</p>` : ''}
        ${video ? '<p class="muted small">Contient une video : elle sera diffusee sur Vimeo puis a valider.</p>' : ''}
      </div>
    </div>

    <footer class="pending-actions">
      <button data-act="publish" class="primary">Publier</button>
      <button data-act="reject" class="ghost">Rejeter</button>
    </footer>
  </article>`;
}

$('#pending-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const cardEl = btn.closest('.pending-card');
  const id = cardEl.dataset.id;
  const get = (f) => cardEl.querySelector(`[data-f="${f}"]`);
  btn.disabled = true;

  try {
    if (btn.dataset.act === 'reject') {
      await api(`/pending/${id}`, { method: 'DELETE', body: { reason: 'rejete depuis le backend' } });
      toast('Publication rejetee');
    } else {
      const name = get('name').value.trim();
      const wholesale = get('wholesalePrice').value;
      const sale = get('sale').value;
      if (!name) throw new Error('Le nom est obligatoire');
      if (!wholesale) throw new Error('Le prix de gros est obligatoire');
      const result = await api(`/pending/${id}/publish`, {
        method: 'POST',
        body: {
          category_id: get('category_id').value || null,
          wholesale_price: wholesale,
          suggested_sale_price: sale || null,
          extraction: { name, description: get('description').value.trim() },
        },
      });
      toast(`Produit #${result.productId} publie (${result.media} image(s))`);
    }
    await loadAll();
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    btn.disabled = false;
  }
});

$('#refresh-pending').addEventListener('click', loadAll);

// ---------- produits ----------
async function loadProducts() {
  const status = $('#filter-status').value;
  state.products = await api(`/products${status ? `?status=${status}` : ''}`);
  renderProducts();
}

function renderProducts() {
  const body = $('#products-table tbody');
  if (!state.products.length) {
    body.innerHTML = '<tr><td colspan="9" class="empty">Aucun produit.</td></tr>';
    return;
  }
  body.innerHTML = state.products.map((p) => {
    const status = p.status || (p.is_published_to_website ? 'published' : 'draft');
    const label = { published: 'en ligne', pending: 'a valider', draft: 'brouillon' }[status] || status;
    return `
    <tr data-id="${p.id}">
      <td data-label="Selection"><input type="checkbox" data-role="select" ${state.selected.has(p.id) ? 'checked' : ''} /></td>
      <td data-label="Visuel">${p.image_url ? `<img class="thumb" src="${esc(p.image_url)}" alt="" loading="lazy" />` : '<span class="muted">—</span>'}</td>
      <td data-label="Nom" class="name-cell">${esc(p.name)}</td>
      <td data-label="Categorie">
        <select data-role="category">
          <option value="">—</option>
          ${state.categories.map((c) => `<option value="${esc(c.id)}" ${c.id === p.category_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
      </td>
      <td data-label="Gros">${p.wholesale_price ?? '—'}</td>
      <td data-label="Vente">${p.suggested_sale_price ?? '—'}</td>
      <td data-label="Medias"><button class="ghost" data-role="media">${state.media.get(p.id)?.length ?? 0}</button></td>
      <td data-label="Etat"><span class="pill ${status === 'published' ? 'pill-ok' : 'pill-warn'}">${label}</span></td>
      <td data-label="Actions" class="actions">
        ${status === 'pending' ? `<button class="primary" data-role="validate">Valider</button>` : ''}
        <button class="ghost" data-role="toggle">${p.is_published_to_website ? 'DepUBLier' : 'Publier'}</button>
        <button class="ghost danger" data-role="delete">Supprimer</button>
      </td>
    </tr>`;
  }).join('');

  syncSelectionUI();
}

/** Aligne la case « tout » du header et le bouton de la barre d'outils. */
function syncSelectionUI() {
  const all = $('#check-all');
  all.checked = state.products.length > 0 && state.selected.size === state.products.length;
  all.indeterminate = state.selected.size > 0 && !all.checked;
  $('#select-all').textContent = all.checked ? 'Tout deselectionner' : 'Tout selectionner';
}

$('#products-table').addEventListener('change', (e) => {
  const row = e.target.closest('tr');
  if (!row) return;
  const id = Number(row.dataset.id);
  if (e.target.dataset.role === 'select') {
    e.target.checked ? state.selected.add(id) : state.selected.delete(id);
    syncSelectionUI();
  }
  if (e.target.dataset.role === 'category' && e.target.value) {
    api(`/products/${id}`, { method: 'PATCH', body: { category_id: e.target.value } })
      .then(() => toast('Categorie mise a jour'))
      .catch((err) => toast(err.message, 'err'));
  }
});

$('#check-all').addEventListener('change', (e) => {
  selectAll(e.target.checked);
});

$('#select-all').addEventListener('click', () => {
  selectAll(!$('#check-all').checked);
});

function selectAll(on) {
  state.selected.clear();
  if (on) state.products.forEach((p) => state.selected.add(p.id));
  renderProducts();
}

$('#bulk-category').addEventListener('change', async (e) => {
  if (!e.target.value || !state.selected.size) return;
  try {
    const r = await api('/products/bulk-category', {
      method: 'POST',
      body: { ids: [...state.selected], category_id: e.target.value },
    });
    toast(`${r.updated} produit(s) deplace(s)`);
    state.selected.clear();
    await loadAll();
  } catch (err) {
    toast(err.message, 'err');
  }
});

$('#products-table').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-role]');
  if (!btn) return;
  const id = Number(btn.closest('tr').dataset.id);
  const role = btn.dataset.role;
  btn.disabled = true;
  try {
    if (role === 'delete') {
      if (!confirm('Supprimer definitivement ce produit et ses medias ?')) return;
      await api(`/products/${id}`, { method: 'DELETE' });
      toast('Produit supprime');
    } else if (role === 'toggle') {
      const p = state.products.find((x) => x.id === id);
      await api(`/products/${id}/publish`, { method: 'POST', body: { published: !p.is_published_to_website } });
      await loadAll();
    } else if (role === 'validate') {
      await api(`/products/${id}/validate`, { method: 'POST' });
      toast('Produit valide et mis en ligne');
      await loadAll();
    } else if (role === 'media') {
      openMedia(id);
    }
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    btn.disabled = false;
  }
});

$('#refresh-products').addEventListener('click', loadAll);
$('#filter-status').addEventListener('change', loadProducts);

async function openMedia(productId) {
  const media = await api(`/products/${productId}/media`);
  state.media.set(productId, media);
  const hasVideo = media.some((m) => m.media_type === 'vimeo');
  const alt = media
    .map(
      (m) => `<li>
        ${m.media_type === 'image' ? `<img class="thumb" src="${esc(m.media_url)}" alt="" />` : `<span class="pill">${esc(m.media_type)}</span>`}
        <code>${esc(String(m.media_url).slice(0, 60))}</code>
        <button class="ghost danger" data-del="${esc(m.id)}">Supprimer</button>
      </li>`,
    )
    .join('');
  const details = document.createElement('details');
  details.className = 'card media-panel';
  details.innerHTML = `<summary>Medias du produit #${productId} (${media.length})</summary>
    <ul class="media-list">${alt || '<li class="muted">Aucun media.</li>'}</ul>
    <div class="row">
      <input type="url" placeholder="Ajouter une image par URL" id="extra-url" />
      <button class="ghost" id="add-url">Ajouter</button>
    </div>
    ${hasVideo ? '' : `<div class="row"><input type="url" placeholder="URL de la video (staging)" id="video-url" /><button class="ghost" id="to-vimeo">Diffuser sur Vimeo</button></div>`}`;
  document.querySelector('main').append(details);
  details.open = true;

  details.querySelector('#add-url')?.addEventListener('click', async () => {
    const input = details.querySelector('#extra-url');
    if (!input.value) return;
    await api(`/products/${productId}/media`, { method: 'POST', body: { url: input.value } });
    details.remove();
    toast('Image ajoutee');
    await loadProducts();
  });

  details.querySelector('#to-vimeo')?.addEventListener('click', async () => {
    const input = details.querySelector('#video-url');
    if (!input.value) return toast('URL de la video requise', 'err');
    const btn = details.querySelector('#to-vimeo');
    btn.disabled = true;
    btn.textContent = 'Envoi en cours...';
    try {
      const r = await api(`/products/${productId}/video`, { method: 'POST', body: { url: input.value } });
      toast(`Video diffusee sur Vimeo (#${r.videoId}) — valide le produit`);
      details.remove();
      await loadAll();
    } catch (err) {
      toast(err.message, 'err');
      btn.disabled = false;
      btn.textContent = 'Diffuser sur Vimeo';
    }
  });

  details.addEventListener('click', async (e) => {
    const del = e.target.closest('button[data-del]');
    if (!del) return;
    await api(`/media/${del.dataset.del}`, { method: 'DELETE' });
    details.remove();
    toast('Media supprime');
    await loadProducts();
  });
}

// ---------- categories ----------
async function loadCategories() {
  state.categories = await api('/categories');
  const sel = $('#bulk-category');
  const current = sel.value;
  sel.innerHTML = '<option value="">Deplacer la selection vers...</option>' +
    state.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  sel.value = current;

  $('#categories-list').innerHTML = state.categories
    .map(
      (c) => `<div class="card cat-card">
        <input data-id="${esc(c.id)}" value="${esc(c.name)}" />
        <span class="muted small">${esc(c.slug)} · ordre ${c.display_order ?? 0} ${c.is_active ? '' : '· inactif'}</span>
        <button class="ghost" data-save="${esc(c.id)}">Enregistrer</button>
      </div>`,
    )
    .join('');

  renderPending();
}

$('#categories-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-save]');
  if (!btn) return;
  const input = $('#categories-list').querySelector(`input[data-id="${btn.dataset.save}"]`);
  try {
    await api(`/categories/${btn.dataset.save}`, { method: 'PATCH', body: { name: input.value.trim() } });
    toast('Categorie enregistree');
    await loadCategories();
  } catch (err) {
    toast(err.message, 'err');
  }
});

$('#refresh-categories').addEventListener('click', loadAll);

boot();
