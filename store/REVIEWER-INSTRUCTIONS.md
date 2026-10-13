# Test instructions · Chrome Web Store

Copy the English section to the dashboard's Test instructions field. It describes the actual live-login prerequisite and provides a no-login demo for layout/export checks. Do not provide the publisher's personal X credentials.

## English

X Export has one purpose: turn user-selected, already-loaded X posts/articles into local documents. The extension itself has no account or paid feature.

A. Demo (no X account required)
1. Open the extension popup and click Try demo. The built-in original sample opens in a preview tab and is clearly labeled Demo content.
2. Choose English or Simplified Chinese from Language. Try the Paper, Clean and Night styles; edit the title and change text size/content options.
3. Choose Markdown → Export Markdown. Save the .md file and verify headings, text, list and quote formatting.
4. Choose HTML → Export HTML. Open the saved standalone .html file. There are no remote scripts/fonts. The built-in demo has no remote image.
5. Choose PDF → Export PDF. Chrome opens its native print dialog. Choose Save as PDF and disable headers and footers. A4 pages contain only the document, without editor controls. PDF is saved through printing, not a direct Chrome download.
6. Open Help & privacy for instructions, local data controls and the bundled bilingual privacy policy.

B. Capture from X (an X account signed in to this Chrome browser is required)
1. Sign in to X with your test account, then open a post detail or full article. Expand Show more and wait for the body to load.
2. Public example: https://x.com/wquguru/status/2109458639501271530
   Associated long article: https://x.com/wquguru/status/2109650264601117141
   Availability is controlled by X; if unavailable, use a currently accessible post/article in your test account. The extension does not bypass login, subscriptions or access controls.
3. Click the extension toolbar icon → Read current post. activeTab grants temporary access. Check the author, body, image references and original link in the preview. Only the current post is selected by default. If other posts by the same author are loaded, review them before manually selecting them; they may be unrelated.
4. Export Markdown. Its images use original online URLs.
5. Export HTML/PDF with images enabled. On the first such export Chrome may request optional access to https://pbs.twimg.com/*. Allow it to embed images. A successfully embedded image is a data URI in HTML and reads offline.
6. For the denied-permission case, revoke that site access through Chrome's extension settings and export again; decline the prompt. The document still includes text and explicit original-image links. Failed embeds have the same visible fallback. No extra X host permission is requested.
7. Try a post whose text is still folded. Export is disabled with an instruction to expand the text on X and recapture.
8. In Help & privacy choose Clear temporary documents and confirm. Captured preview tabs become unavailable; saved files and preferences remain. Browser-session storage also clears when Chrome closes.

C. Data and permissions
No developer backend, analytics, ads or remote executable code. Post data stays in extension session storage. Layout/language preferences use local storage. pbs.twimg.com image requests use HTTPS; embed fetches omit credentials and referrers and reject redirects. Videos keep a source link, and quoted-post images are not exported. There is no automated scrolling or hidden X API access.

Test account details: The publisher must provide a dedicated review account in the dashboard if Google requires credentials for the live X path. Do not treat the demo as proof of live-page capture, and do not send personal passwords, cookies or tokens through public support channels.

## 中文说明

示例入口可验证双语、排版与三种导出，不需登录。真实提取需 Chrome 已登录 X；审核账号如被后台要求，由发布者在审核专用字段提供，不能使用个人主账号凭据。公开样例 URL 可能受 X 可用性影响。浏览器原生权限/保存/打印窗口应实际操作一次，不能把隔离 DOM 回放的自动化结果描述为该链路的人工验收。
