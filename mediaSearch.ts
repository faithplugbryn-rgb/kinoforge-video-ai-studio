import { StockPhotoResult } from './studio';

/**
 * 100% Free, Zero-API-Key, CORS-safe high-res photography via Wikimedia Commons API.
 * All returned thumb URLs serve `Access-Control-Allow-Origin: *` so they render & export
 * cleanly inside HTML5 Canvas without tainting!
 */
export async function searchWikimediaPhotos(
  query: string,
  limit = 9
): Promise<StockPhotoResult[]> {
  const clean = query.trim() || 'cinematic landscape';
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${clean} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: String(Math.min(20, limit * 2)),
    prop: 'imageinfo',
    iiprop: 'url|mime|size|extmetadata',
    iiurlwidth: '1280',
    format: 'json',
    origin: '*',
  });

  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Stock media search failed (${res.status})`);
  }

  const data = await res.json();
  const pages = Object.values(data?.query?.pages ?? {}) as Array<{
    pageid: number;
    title: string;
    imageinfo?: Array<{
      thumburl?: string;
      url?: string;
      mime?: string;
      width?: number;
      height?: number;
      extmetadata?: {
        Artist?: { value?: string };
      };
    }>;
  }>;

  const results: StockPhotoResult[] = [];
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info) continue;
    const mime = info.mime || '';
    if (!mime.startsWith('image/jpeg') && !mime.startsWith('image/png') && !mime.startsWith('image/webp')) {
      continue;
    }
    if ((info.width ?? 0) < 400 || (info.height ?? 0) < 300) continue;
    const thumb = info.thumburl || info.url;
    if (!thumb) continue;

    // Strip HTML from Wikimedia Artist credit
    const rawArtist = info.extmetadata?.Artist?.value || 'Wikimedia Commons';
    const credit = rawArtist.replace(/<[^>]+>/g, '').trim().slice(0, 60) || 'Wikimedia Commons';

    results.push({
      id: String(p.pageid),
      title: p.title.replace(/^File:/i, '').replace(/\.[^.]+$/, ''),
      thumbUrl: thumb,
      fullUrl: thumb,
      width: info.width ?? 1280,
      height: info.height ?? 720,
      credit,
    });

    if (results.length >= limit) break;
  }

  return results;
}

/**
 * Optional Free Zero-Key AI Image Generation via Pollinations.ai.
 * Validates the response is an actual image (handling free-tier cooldowns gracefully)
 * and converts to an object URL safe for canvas export.
 */
export async function generateFreeAIImage(
  prompt: string,
  width: number,
  height: number,
  seed: number
): Promise<{ url: string; warning?: string }> {
  const safeW = Math.min(1024, Math.max(512, Math.round(width / 64) * 64));
  const safeH = Math.min(1024, Math.max(512, Math.round(height / 64) * 64));
  const encoded = encodeURIComponent(
    `${prompt.trim()}, cinematic lighting, ultra detailed, film still`
  );
  const endpoint = `https://image.pollinations.ai/prompt/${encoded}?width=${safeW}&height=${safeH}&seed=${seed}&nologo=true`;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 28000);

  try {
    const res = await fetch(endpoint, { signal: controller.signal });
    const ct = res.headers.get('content-type') || '';

    if (!res.ok || !ct.startsWith('image/')) {
      let detail = `Free AI image server busy (HTTP ${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          detail = errJson.error.message;
        }
      } catch {
        // ignore JSON parse error
      }
      throw new Error(detail);
    }

    const blob = await res.blob();
    if (blob.size < 2000) {
      throw new Error('AI image response was unexpectedly empty.');
    }
    const objectUrl = URL.createObjectURL(blob);
    return { url: objectUrl };
  } finally {
    window.clearTimeout(timer);
  }
}
