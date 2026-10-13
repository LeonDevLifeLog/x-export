const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;

/** Embed only X's image CDN. Exported documents never carry cookies or scripts. */
export async function embedImages(doc, onProgress = () => {}) {
  const sources = [...new Set(doc.posts.flatMap((post) => post.blocks.filter((block) => block.type === 'image').map((block) => block.src)))];
  const assets = {};
  const failed = [];
  let completed = 0;
  let totalBytes = 0;
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(3, sources.length) }, async () => {
    while (cursor < sources.length) {
      const source = sources[cursor++];
      try {
        const url = new URL(source);
        if (url.protocol !== 'https:' || url.hostname !== 'pbs.twimg.com') throw new Error('不支持的图片来源');
        const response = await fetch(url, { credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const contentType = response.headers.get('content-type')?.split(';')[0].toLowerCase();
        if (!/^image\/(png|jpeg|webp|gif)$/.test(contentType)) throw new Error('不支持的图片格式');
        const declaredSize = Number(response.headers.get('content-length'));
        if (declaredSize > MAX_IMAGE_BYTES) throw new Error('图片过大');
        const reader = response.body.getReader();
        const chunks = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            totalBytes += value.byteLength;
            if (size > MAX_IMAGE_BYTES || totalBytes > MAX_TOTAL_BYTES) throw new Error('图片超过导出大小限制');
            chunks.push(value);
          }
        } catch (error) { await reader.cancel().catch(() => {}); throw error; }
        const blob = new Blob(chunks, { type: contentType });
        assets[source] = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('无法编码图片'));
          reader.readAsDataURL(blob);
        });
      } catch { failed.push(source); }
      onProgress(++completed, sources.length);
    }
  }));
  return { assets, failed };
}
