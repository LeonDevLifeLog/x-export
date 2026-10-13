/** Self-contained: Chrome serializes this function into the active tab. */
export function extractXPage() {
  const pageURL = new URL(location.href);
  if (!/^(www\.|mobile\.)?(x\.com|twitter\.com)$/.test(pageURL.hostname)) {
    throw new Error('X_EXPORT_UNSUPPORTED_PAGE');
  }
  const statusPattern = /^\/([^/]+)\/status\/(\d+)/;
  const statusOf = (href) => {
    try {
      const url = new URL(href, pageURL);
      if (!/^(www\.|mobile\.)?(x\.com|twitter\.com)$/.test(url.hostname)) return null;
      const match = url.pathname.match(statusPattern);
      return match ? { id: match[2], handle: match[1], url: `https://x.com/${match[1]}/status/${match[2]}` } : null;
    } catch { return null; }
  };
  const clean = (text) => text.replace(/\u00a0/g, ' ').replace(/\u200b/g, '').trim();
  const safeURL = (href) => {
    try {
      const url = new URL(href, pageURL);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const imageURL = (src) => {
    try {
      const url = new URL(src, pageURL);
      if (url.protocol !== 'https:' || url.hostname !== 'pbs.twimg.com') return '';
      if (url.pathname.startsWith('/media/')) url.searchParams.set('name', 'large');
      return url.href;
    } catch { return ''; }
  };
  const runsOf = (node, marks = {}) => {
    if (node.nodeType === Node.TEXT_NODE) return [{ text: node.textContent, ...marks }];
    if (node.nodeType !== Node.ELEMENT_NODE || /^(SCRIPT|STYLE|BUTTON|SVG)$/.test(node.tagName)) return [];
    if (node.tagName === 'BR') return [{ text: '\n', ...marks }];
    if (node.tagName === 'IMG') return !imageURL(node.currentSrc || node.src) && node.alt ? [{ text: node.alt, ...marks }] : [];
    const next = { ...marks };
    if (node.tagName === 'A') next.href = safeURL(node.getAttribute('href'));
    if (/^(STRONG|B)$/.test(node.tagName) || Number(node.style.fontWeight) >= 600 || node.style.fontWeight === 'bold') next.bold = true;
    if (/^(EM|I)$/.test(node.tagName) || node.style.fontStyle === 'italic') next.italic = true;
    if (/^(S|DEL)$/.test(node.tagName) || node.style.textDecoration.includes('line-through')) next.strike = true;
    if (node.tagName === 'CODE') next.code = true;
    return Array.from(node.childNodes).flatMap((child) => runsOf(child, next));
  };
  const textOf = (runs) => clean(runs.map((run) => run.text).join(''));
  const readBlocks = (container, permalink) => {
    const blocks = [];
    const semanticBlocks = 'p,h1,h2,h3,h4,h5,h6,ul,ol,blockquote,pre,[data-testid="markdown-code-block"],[data-testid="simpleTweet"]';
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (clean(node.textContent)) blocks.push({ type: 'paragraph', runs: [{ text: node.textContent }] });
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || /^(SCRIPT|STYLE|BUTTON|SVG)$/.test(node.tagName)) return;
      if (node.matches('[data-testid="simpleTweet"]')) {
        const text = node.querySelector('[data-testid="tweetText"]');
        if (text) blocks.push({ type: 'quote', embedded: true, author: clean(node.querySelector('[data-testid="User-Name"]')?.textContent || ''), runs: runsOf(text), url: statusOf(node.querySelector('time')?.closest('a')?.href)?.url || '' });
        return;
      }
      if (node.matches('[data-testid="videoPlayer"],video')) { blocks.push({ type: 'video', url: permalink }); return; }
      if (node.matches('[data-testid="markdown-code-block"]')) {
        const code = node.querySelector('code,pre');
        if (code) blocks.push({ type: 'code', runs: [{ text: code.textContent }] });
        return;
      }
      if (node.tagName === 'IMG') {
        const src = imageURL(node.currentSrc || node.src);
        if (src) blocks.push({ type: 'image', src, alt: node.alt || '' });
        return;
      }
      if (/^(UL|OL)$/.test(node.tagName)) {
        const items = Array.from(node.children).filter((item) => item.tagName === 'LI').map((item) => runsOf(item));
        if (items.length) blocks.push({ type: 'list', ordered: node.tagName === 'OL', items });
        return;
      }
      const heading = node.tagName.match(/^H([1-6])$/);
      if (node.hasAttribute('data-block') && node.querySelector(semanticBlocks)) { node.childNodes.forEach(walk); return; }
      if (heading || /^(P|BLOCKQUOTE|PRE)$/.test(node.tagName) || node.hasAttribute('data-block') || node.classList.contains('public-DraftStyleDefault-block') || node.classList.contains('longform-unstyled')) {
        const runs = runsOf(node);
        if (textOf(runs)) blocks.push({ type: heading ? 'heading' : node.tagName === 'BLOCKQUOTE' ? 'quote' : node.tagName === 'PRE' ? 'code' : 'paragraph', level: heading ? Number(heading[1]) : undefined, runs });
        node.querySelectorAll('img').forEach((img) => { if (imageURL(img.src)) walk(img); });
        return;
      }
      const hasBlocks = node.querySelector(`${semanticBlocks},[data-block],.public-DraftStyleDefault-block,.longform-unstyled`);
      if (!hasBlocks && textOf(runsOf(node)) && !node.querySelector('img[src*="pbs.twimg.com"]')) {
        blocks.push({ type: 'paragraph', runs: runsOf(node) });
      } else {
        node.childNodes.forEach(walk);
      }
    };
    container.childNodes.forEach(walk);
    return blocks;
  };
  const tweetSelector = '[data-testid="tweet"], article';
  const quoteSelector = '[data-testid="quoteTweet"], [data-testid="simpleTweet"], [data-testid="card.wrapper"][role="link"], div[role="link"][tabindex="0"], article article';
  const textSelector = '[data-testid="tweetText"], [dir="auto"].whitespace-pre-wrap';
  const own = (article, selector) => Array.from(article.querySelectorAll(selector)).filter((node) => {
    const tweet = node.closest(tweetSelector);
    return (!tweet || tweet === article) && !node.closest(quoteSelector);
  });
  const permalinkOf = (article) => {
    const links = own(article, 'a[href]').filter((link) => {
      const identity = statusOf(link.href);
      return identity && new URL(link.href).pathname.replace(/\/$/, '') === new URL(identity.url).pathname && !link.closest('[data-engagement-action]');
    });
    return links.find((link) => link.querySelector('time')) || links.find((link) => /\d{1,2}:\d{2}|\d{4}年|\d+(?:小时|分钟|秒|天)|\d+月\d+日|\d+\s*(?:h|m|s|d|hours?|minutes?)\b/i.test(clean(link.textContent))) || links[0];
  };
  const parseTweet = (article) => {
    const time = own(article, 'time').find((item) => statusOf(item.closest('a')?.href));
    const permalink = time?.closest('a') || permalinkOf(article);
    const identity = statusOf(permalink?.href);
    if (!identity) return null;
    const nameNode = own(article, '[data-testid="User-Name"]')[0];
    const authorLink = (nameNode ? Array.from(nameNode.querySelectorAll('a')) : own(article, 'a[href]')).find((link) => {
      try { return new URL(link.href).pathname.toLowerCase() === `/${identity.handle.toLowerCase()}` && clean(link.textContent) && !clean(link.textContent).startsWith('@'); } catch { return false; }
    });
    const author = clean(authorLink?.textContent || nameNode?.querySelector('[dir="ltr"]')?.textContent || identity.handle);
    const text = own(article, textSelector)[0];
    const body = text ? [{ type: 'paragraph', runs: runsOf(text) }] : [];
    own(article, '[data-testid="tweetPhoto"] img, img[src*="pbs.twimg.com/media/"]').forEach((img) => {
      const src = imageURL(img.currentSrc || img.src);
      if (src && !body.some((block) => block.src === src)) body.push({ type: 'image', src, alt: img.alt || '' });
    });
    if (own(article, 'video, [data-testid="videoPlayer"]').length) body.push({ type: 'video', url: identity.url });
    const quote = article.querySelector(quoteSelector);
    let quoted = null;
    if (quote) {
      const quoteText = quote.querySelector(textSelector);
      const quoteTime = quote.querySelector('time');
      const quotePermalink = Array.from(quote.querySelectorAll('a[href]')).find((link) => statusOf(link.href) && new URL(link.href).pathname === new URL(statusOf(link.href).url).pathname);
      const quoteIdentity = statusOf(quoteTime?.closest('a')?.href || quote.getAttribute('href') || quotePermalink?.href);
      if (quoteText) quoted = {
        author: clean(quote.querySelector('[data-testid="User-Name"]')?.textContent || Array.from(quote.querySelectorAll('a[href]')).find((link) => clean(link.textContent) && !clean(link.textContent).startsWith('@'))?.textContent || ''),
        url: quoteIdentity?.url || '',
        runs: runsOf(quoteText),
      };
    }
    const folded = own(article, '[data-testid="tweet-text-show-more-link"]').length > 0 || own(article, 'button').some((button) => /^(显示更多|展开|Show more)$/i.test(clean(button.textContent)));
    return { ...identity, author, publishedAt: time?.getAttribute('datetime') || '', publishedLabel: time ? '' : clean(permalink?.textContent || ''), title: '', blocks: body, quote: quoted, truncated: folded };
  };
  const nodes = Array.from(document.querySelectorAll('main [data-testid="tweet"], main article')).filter((node) => !node.parentElement?.closest(tweetSelector));
  const posts = [];
  const seen = new Set();
  for (const node of nodes) {
    const post = parseTweet(node);
    if (post && !seen.has(post.id)) { posts.push(post); seen.add(post.id); }
  }
  const current = statusOf(pageURL.href);
  let root = posts.find((post) => post.id === current?.id);
  if (!root && !current) {
    const visible = nodes.find((node) => { const rect = node.getBoundingClientRect(); return rect.bottom > 0 && rect.top < innerHeight && rect.width > 0; });
    root = visible ? posts.find((post) => post.id === parseTweet(visible)?.id) : posts[0];
  }
  const readView = document.querySelector('[data-testid="twitterArticleReadView"]');
  const richText = readView?.querySelector('[data-testid="twitterArticleRichTextView"]') || document.querySelector('[data-testid="twitterArticleRichTextView"]');
  if (richText) {
    const articleScope = readView?.closest('[data-testid="tweet"]') || readView?.parentElement || richText.parentElement;
    const titleNode = articleScope.querySelector('[data-testid="twitter-article-title"], [data-testid="twitterArticleTitle"]') || document.querySelector('[data-testid="twitter-article-title"], [data-testid="twitterArticleTitle"]') || readView?.querySelector('h1');
    const title = clean(titleNode?.textContent || document.title.replace(/\s*[\/|]\s*[Xx]\s*$/, ''));
    if (!root) {
      const identity = current || { id: pageURL.pathname.split('/').filter(Boolean).at(-1), handle: '', url: pageURL.href };
      const authorNode = articleScope.querySelector('[data-testid="User-Name"]');
      const authorMeta = document.querySelector('[itemprop="author"]');
      const metaName = authorMeta?.querySelector('meta[itemprop="name"]')?.content;
      const metaHandle = authorMeta?.querySelector('meta[itemprop="additionalName"]')?.content?.replace(/^@/, '');
      root = { ...identity, handle: identity.handle || metaHandle || '', author: clean(metaName || authorNode?.textContent?.split('@')[0] || identity.handle || 'X'), publishedAt: articleScope.querySelector('time')?.getAttribute('datetime') || '', title, blocks: [], quote: null, truncated: false };
      posts.unshift(root);
    }
    root.title = title;
    root.blocks = readBlocks(richText, root.url);
    const cover = articleScope.querySelector('[data-testid="twitterArticleHeaderImage"] img') || Array.from((readView || articleScope).querySelectorAll('[data-testid="tweetPhoto"] img')).find((img) => !richText.contains(img));
    if (cover && imageURL(cover.src) && !root.blocks.some((block) => block.src === imageURL(cover.src))) root.blocks.unshift({ type: 'image', src: imageURL(cover.src), alt: cover.alt || '' });
    root.truncated = false;
  }
  if (!root || !root.blocks.length) throw new Error('X_EXPORT_NO_CONTENT');
  const related = posts.filter((post) => post.id === root.id || (root.handle && post.handle.toLowerCase() === root.handle.toLowerCase()));
  const plain = root.blocks.flatMap((block) => block.runs || []).map((run) => run.text).join('');
  return {
    version: 1,
    rootId: root.id,
    title: root.title || clean(plain.split('\n').find((line) => clean(line)) || `${root.author} · X`).slice(0, 72),
    pageUrl: root.url,
    capturedAt: new Date().toISOString(),
    kind: root.title ? 'article' : 'post',
    posts: related,
    warnings: related.length > 1 ? ['LOADED_POSTS_MAY_BE_UNRELATED'] : [],
  };
}
