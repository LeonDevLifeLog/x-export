export const demoDocument = {
  version: 1,
  rootId: 'demo',
  title: '让好内容，拥有第二次生命。',
  pageUrl: 'https://x.com',
  capturedAt: '2026-10-13T02:00:00.000Z',
  kind: 'article',
  warnings: [],
  posts: [{
    id: 'demo', author: 'X Export 编辑部', handle: '', publishedAt: '2026-10-13T02:00:00.000Z', url: '', title: '让好内容，拥有第二次生命。', truncated: false,
    blocks: [
      { type: 'paragraph', runs: [{ text: '我们每天读到很多文字，但真正想留下来的，往往只有那么几篇。一个有趣的观点，一段真诚的表达，或者一句恰好说进心里的话。' }] },
      { type: 'paragraph', runs: [{ text: '它们值得被收藏，也值得拥有更舒服的阅读方式。' }] },
      { type: 'heading', level: 2, runs: [{ text: '从信息流，到你的书架' }] },
      { type: 'paragraph', runs: [{ text: 'X Export 想做一件简单的事：把匆匆滑过的内容，变成一份可以慢慢读的文档。保留作者与原文，整理段落和图片，让文字回到阅读的中心。' }] },
      { type: 'quote', runs: [{ text: '收藏，是给未来的自己，留下一次重新相遇的机会。' }] },
      { type: 'heading', level: 2, runs: [{ text: '为不同的时刻，留一份不同的版本' }] },
      { type: 'list', ordered: false, items: [
        [{ text: 'Markdown', bold: true }, { text: '：放进笔记库，继续编辑、整理与思考。' }],
        [{ text: 'HTML', bold: true }, { text: '：带着完整排版，打开就能读，图片嵌入后可以离线收藏。' }],
        [{ text: 'PDF', bold: true }, { text: '：一份安静、清晰的纸面文档，适合分享和打印。' }],
      ] },
      { type: 'paragraph', runs: [{ text: '试着切换左侧的阅读风格，找到你喜欢的那一页。之后打开一篇 X 发文，点击扩展图标，就能为它留下一份自己的版本。' }] },
    ], quote: null,
  }],
};

export function createDemoDocument(locale) {
  if (locale === 'zh-CN') return structuredClone(demoDocument);
  const title = 'Give good words a second life.';
  return {
    ...structuredClone(demoDocument), title,
    posts: [{ ...structuredClone(demoDocument.posts[0]), author: 'X Export Studio', title,
      blocks: [
        { type: 'paragraph', runs: [{ text: 'We read so much every day. Only a few words make us want to stop: a thoughtful idea, an honest story, or a sentence that meets us at the right moment.' }] },
        { type: 'paragraph', runs: [{ text: 'Those words deserve a place to stay, and a calmer way to read them.' }] },
        { type: 'heading', level: 2, runs: [{ text: 'From your feed to your bookshelf' }] },
        { type: 'paragraph', runs: [{ text: 'X Export turns posts and articles into documents you can take your time with. Keep the author and source, arrange the text and images, and bring reading back to the center.' }] },
        { type: 'quote', runs: [{ text: 'To save something is to give your future self a chance to meet it again.' }] },
        { type: 'heading', level: 2, runs: [{ text: 'A format for every moment' }] },
        { type: 'list', ordered: false, items: [
          [{ text: 'Markdown', bold: true }, { text: ': add it to your notes, then edit and connect your ideas.' }],
          [{ text: 'HTML', bold: true }, { text: ': keep the layout and read offline once images are embedded.' }],
          [{ text: 'PDF', bold: true }, { text: ': save through Chrome printing for sharing or reading on paper.' }],
        ] },
        { type: 'paragraph', runs: [{ text: 'Try the reading styles on the left. Then open a post on X, click the extension icon, and keep a copy in your own style.' }] },
      ],
    }],
  };
}
