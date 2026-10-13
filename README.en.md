# X Export

[简体中文](README.md) · [Store submission kit](store/SUBMISSION.md)

A local Chrome Manifest V3 extension to save X posts and articles as Markdown, styled standalone HTML, or PDF through Chrome printing. Version 1.1.0 includes English and Simplified Chinese. It is an independent tool, not affiliated with X Corp.

## Install and use

```sh
npm ci
npm run build
```

Open `chrome://extensions`, enable Developer mode, and load unpacked `dist/x-export`. Pin the extension. The ZIP contains `manifest.json` at its root; unzip it before loading unpacked. The extension has not yet been published to the Chrome Web Store.

Sign in to X in this Chrome browser. Open a post detail or complete article, expand Show more and wait for the body to load. Click the extension → Read current post. Review the preview, edit the title and choose a style/format.

- Markdown saves editable UTF-8 text; images stay as online URLs.
- HTML embeds images into a standalone document for offline reading, with no remote scripts or fonts.
- PDF opens Chrome's print dialog. Choose Save as PDF and disable headers/footers; enable background graphics if wanted. A4 pagination is automatic. This is a print-to-PDF flow, not a direct PDF download.

Only already-loaded content visible to your account is read. The current post is selected by default; other loaded posts by the same author require manual review and may be unrelated. No automatic scrolling, hidden API access, access-control bypass or video download. Quoted images are excluded. X page changes can affect extraction.

Use About at the bottom of the popup to view the developer introduction, GitHub profile and project repository links.

## Privacy and permissions

Required: `activeTab`, `scripting`, `storage`, `downloads`. Optional: `https://pbs.twimg.com/*`, requested when embedding images in an HTML/PDF export. Decline to keep text and original-image links instead. Markdown never requests image access.

No developer backend, analytics, ads, account credentials or remote executable code. Documents use temporary extension session storage; layout/language preferences use local storage, not Sync. Help & privacy lets you clear captured documents and invalidate their previews. Downloaded files are managed separately. Preview images and explicit embeds contact X's CDN. See the [public bilingual privacy policy](https://leondevlifelog.github.io/x-export/privacy.html) and [support page](https://leondevlifelog.github.io/x-export/support.html). Contact the maintainer through [GitHub Issues](https://github.com/LeonDevLifeLog/x-export/issues).

## Develop and prepare a submission

Node.js 20+, system `zip`/`unzip`, and Playwright Chromium are needed for tooling. There are no production dependencies.

```sh
npm run check
npm test
npx playwright install chromium
npm run test:browser
npm run build
npm run store:assets
npm run store:check
npm run store:bundle
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an existing automation browser if needed. Browser scripts use isolated temporary profiles. `npm run dev` serves the original demo at `http://127.0.0.1:4173/preview.html?demo=1`.

The submission kit includes bilingual listing copy, permission/data declarations, reviewer instructions, public website source, 10 actual UI screenshots, a store icon and two promotional images. Upload only `dist/x-export-v1.1.0.zip`. The separate `x-export-webstore-v1.1.0.zip` is a materials handoff archive.

Public policy/support URLs are recorded in `store/metadata.json`. GitHub Pages deploys `store/site` using `.github/workflows/pages.yml` when those files change on `main`, or through manual workflow dispatch. Developer-account setup and the remaining personal Chrome checks still precede store submission. Local validation and website publication do not establish store approval. See [VERIFICATION.md](VERIFICATION.md) for evidence and limitations.
