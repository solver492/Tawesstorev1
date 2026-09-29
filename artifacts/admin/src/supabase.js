// PostgREST + Storage, sans `supabase-js` ni Drizzle : pas de `DATABASE_URL`
// disponible et le schema Drizzle du monorepo ne reflete pas le schema reel.

const DEFAULT_URL = 'https://nfoefhwmgjatbqyibclp.supabase.co';

export class SupabaseError extends Error {
  constructor(message, { status, body, url } = {}) {
    super(message);
    this.name = 'SupabaseError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

export function createClient({
  url = process.env.SUPABASE_URL || DEFAULT_URL,
  key = process.env.SUPABASE_ANON_KEY,
  bucket = process.env.SUPABASE_BUCKET || 'product-media',
} = {}) {
  if (!key) {
    throw new Error(
      'SUPABASE_ANON_KEY manquant. Copie le fichier .env.example en .env et renseigne la cle.',
    );
  }

  const base = `${url.replace(/\/$/, '')}/rest/v1`;
  const storageBase = `${url.replace(/\/$/, '')}/storage/v1`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  async function request(method, target, { body, prefer, query, extraHeaders } = {}) {
    const qs = new URLSearchParams(query || {}).toString();
    const full = `${base}/${target}${qs ? `?${qs}` : ''}`;
    const res = await fetch(full, {
      method,
      headers: {
        ...headers,
        ...(prefer ? { Prefer: prefer } : {}),
        ...(extraHeaders || {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const detail =
        (data && typeof data === 'object' && (data.message || data.error || data.hint)) ||
        (typeof data === 'string' ? data.slice(0, 300) : res.statusText);
      throw new SupabaseError(`PostgREST ${method} ${target} -> ${res.status} : ${detail}`, {
        status: res.status,
        body: data,
        url: full,
      });
    }
    return data;
  }

  /** Colonnes + filtres, ex: { select: '*', id: 'eq.7' } */
  async function select(table, query = {}) {
    const rows = await request('GET', table, { query: { select: '*', ...query } });
    return rows ?? [];
  }

  async function insert(table, rows, { onConflict } = {}) {
    const array = Array.isArray(rows) ? rows : [rows];
    return request('POST', table, {
      body: array,
      query: onConflict ? { on_conflict: onConflict } : undefined,
      prefer: 'return=representation',
    });
  }

  async function update(table, filters, patch) {
    return request('PATCH', table, {
      body: patch,
      query: filters,
      prefer: 'return=representation',
    });
  }

  async function remove(table, filters) {
    return request('DELETE', table, { query: filters, prefer: 'return=representation' });
  }

  async function count(table, query = {}) {
    const qs = new URLSearchParams({ ...query, select: 'id', limit: '1' }).toString();
    const res = await fetch(`${base}/${table}?${qs}`, {
      method: 'HEAD',
      headers: { ...headers, Prefer: 'count=exact', Range: '0-0' },
    });
    if (!res.ok) {
      throw new SupabaseError(`Count ${table} -> ${res.status}`, { status: res.status });
    }
    const range = res.headers.get('content-range') || '';
    const total = Number(range.split('/')[1] ?? 0);
    return Number.isFinite(total) ? total : 0;
  }

  // ---- Storage ------------------------------------------------------------

  async function upload(path, body, contentType = 'application/octet-stream') {
    const safe = path.replace(/^\/+/, '');
    const res = await fetch(`${storageBase}/object/${bucket}/${safe}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': contentType, 'x-upsert': 'true' },
      body: typeof body === 'string' ? body : Buffer.from(body),
    });
    if (!res.ok) {
      throw new SupabaseError(`Storage upload ${safe} -> ${res.status} : ${await res.text()}`, {
        status: res.status,
        url: safe,
      });
    }
    return { path: safe, publicUrl: publicUrl(safe) };
  }

  function publicUrl(path) {
    return `${storageBase}/object/public/${bucket}/${path.replace(/^\/+/, '')}`;
  }

  async function listFiles(prefix = '') {
    const qs = new URLSearchParams();
    if (prefix) qs.set('prefix', prefix);
    const res = await fetch(`${storageBase}/object/list/${bucket}?${qs}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 1000, offset: 0 }),
    });
    if (!res.ok) throw new SupabaseError(`Storage list -> ${res.status}`, { status: res.status });
    return res.json();
  }

  return { url, bucket, select, insert, update, remove, count, upload, publicUrl, listFiles };
}
