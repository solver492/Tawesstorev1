const DEFAULT_API = 'https://api.vimeo.com';

export function isVimeoConfigured() {
  return Boolean(process.env.VIMEO_ACCESS_TOKEN);
}

export function vimeoEmbedUrl(videoIdOrUrl) {
  const id = String(videoIdOrUrl).match(/(?:video\/)(\d+)/)?.[1] ?? String(videoIdOrUrl);
  return `https://player.vimeo.com/video/${id}`;
}

export function vimeoPageUrl(videoIdOrUrl) {
  const id = String(videoIdOrUrl).match(/(?:video\/)(\d+)/)?.[1] ?? String(videoIdOrUrl);
  return `https://vimeo.com/${id}`;
}

async function api(token, method, path, { body, raw, headers = {} } = {}) {
  const res = await fetch(`${DEFAULT_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.vimeo.*+json;version=3.4',
      ...(raw ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...(raw ? { body: raw } : body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const detail = data?.error?.details?.[0]?.reason || data?.error?.message || text.slice(0, 200);
    throw new Error(`Vimeo ${method} ${path} -> ${res.status} : ${detail}`);
  }
  return data;
}

export async function uploadVideo({ buffer, fileName, name, description = '' }) {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'VIMEO_ACCESS_TOKEN manquant : impossible de diffuser la video sur Vimeo. Renseigne-le dans .env puis redemarre.',
    );
  }

  const size = buffer.length;
  const created = await api(token, 'POST', '/me/videos', {
    body: {
      name: name || fileName,
      description,
      upload: { approach: 'streaming', size },
    },
  });

  const id = created.uri.split('/').pop();

  await api(token, 'PUT', `/me/videos/${id}/upload`, {
    raw: buffer,
    headers: { 'Content-Type': contentTypeFor(fileName) },
  });

  const finished = await waitForProcessing(token, id);
  return {
    videoId: id,
    pageUrl: finished.link || vimeoPageUrl(id),
    embedUrl: vimeoEmbedUrl(id),
    status: finished.status,
  };
}

async function waitForProcessing(token, id, { attempts = 20, delayMs = 4000 } = {}) {
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    last = await api(token, 'GET', `/videos/${id}`);
    if (last.status === 'available') return last;
    if (last.status === 'error') {
      throw new Error(last.error ?? 'Vimeo a refuse le traitement de la video');
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return last;
}

function contentTypeFor(name = '') {
  if (/\.mp4$/i.test(name)) return 'video/mp4';
  if (/\.mov$/i.test(name)) return 'video/quicktime';
  if (/\.webm$/i.test(name)) return 'video/webm';
  if (/\.m4v$/i.test(name)) return 'video/x-m4v';
  return 'application/octet-stream';
}
