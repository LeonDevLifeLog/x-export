# X Export · 发文留存

一个无需服务器的 Chrome Manifest V3 扩展。将 X（Twitter）的帖子和长文，导出为可编辑的 Markdown、精美的独立 HTML，或通过 Chrome 打印保存为 PDF。

## 安装

从 GitHub 克隆源码后，先在项目目录执行 `npm ci` 和 `npm run build`，生成下方扩展目录与 ZIP。

已构建的扩展位于 `dist/x-export/`，可分发 ZIP 为 `dist/x-export-v1.0.0.zip`。

1. 在 Chrome 地址栏输入 `chrome://extensions`。
2. 打开右上角的“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择本项目的 `dist/x-export` 文件夹。
4. 将 **X Export · 发文留存** 固定到工具栏。

ZIP 需要先解压，再选择解压后的 `x-export` 文件夹。本项目尚未发布到 Chrome 应用商店。

## 使用

**使用前提：当前 Chrome 浏览器已登录 X 账号。** 扩展直接读取该账号当前页面可以查看的内容，复用浏览器现有登录态，无需再次登录。插件不会读取、存储或导出账号 Cookie、密码和访问令牌。

1. 在已登录的 X 中打开帖子详情或长文的完整阅读页面。展开“显示更多”，等待正文加载；要合并连续发文时，先在页面中加载需要的内容。
2. 点击扩展图标，再点击“读取当前发文”。
3. 在新打开的预览页修改标题、选择格式与阅读风格。默认只选择当前发文；可在“选择发文”中逐条勾选同作者已加载的其他内容。
4. 点击导出：
   - **Markdown**：UTF-8 `.md` 文件。保留段落、链接、标题、列表、代码和引用；图片以 CDN 链接保留，图片链接需要联网。
   - **HTML**：独立 `.html` 文件，内置样式、嵌入成功的配图，可离线阅读；没有外部脚本或远程字体。可在浏览器打开，也可继续打印。
   - **PDF**：扩展打开 Chrome 打印窗口，选择“保存为 PDF”。建议关闭“页眉和页脚”，如需背景色可打开“背景图形”。打印使用 A4 自动分页，夜读风格转为适合纸张的浅色。扩展不会直接写入 PDF；文件位置与保存操作由打印窗口完成。

在扩展弹窗点击“体验示例”，可先体验排版。示例文字由本项目提供，不是从某个 X 账号抓取的发文。

## 首版范围与边界

- 支持 `x.com`、`twitter.com` 及其 `www` / `mobile` 域名。
- 帖子正文、中文、换行、emoji、作者、日期、图片、引用文字与原文链接。
- 同时适配传统 `data-testid` 页面与新版语义 `article` / 正文结构。长文读取 `twitterArticleReadView` / `twitterArticleRichTextView`，保留标题、段落、富文本、列表、代码及配图。
- 视频保留“在 X 查看”链接，不下载视频。引用发文保留作者、文字及来源，引用中的图片不单独导出。
- 从详情页优先匹配 URL 中的帖子 ID；在信息流中读取当前视口的第一条已加载帖子。建议使用详情页，以明确目标。
- 同作者的已加载内容可能包含独立帖子或回复，**不被自动认定为完整串文**。用户需核对后手动选择；不自动滚动、不调用 X 私有 API、不补全未加载内容。
- 检测到所选正文仍折叠时阻止导出，提示回到 X 展开后重新读取。
- 只能导出当前页面可以读取的内容；无法绕过登录、订阅、访问权限或页面加载限制。
- X 的页面结构会变化。正文选择器是兼容性边界；请用目标账号可见的真实页面完成最终验收。

## 排版

三种阅读风格：**纸感杂志 / 纯净白 / 夜读**。支持三档正文字号，独立开关配图、原文链接和引用。

预览、HTML 和 PDF 使用同一套正文生成器和 `document.css`，打印样式隐藏编辑界面，处理标题、段落、配图和分页。界面支持键盘操作、可见焦点、状态提示、减少动态效果与窄屏布局。

## 权限与数据

| 权限 | 用途 |
| --- | --- |
| `activeTab` | 用户点击扩展后临时读取当前页面 |
| `scripting` | 在该页面注入只读的正文提取函数 |
| `storage` | 会话内暂存发文；在本机保存排版偏好 |
| `downloads` | 将 Markdown / HTML 交给 Chrome 下载 |
| `https://pbs.twimg.com/*` | 读取 X 图片 CDN，嵌入 HTML / PDF |

没有常驻内容脚本、后台服务、统计埋点、后端接口或账号凭据处理。正文放在扩展专用的 `chrome.storage.session`，关闭浏览器后清除；超过 24 小时的记录在下一次读取时清理。主题等偏好放在 `chrome.storage.local`。打开多个预览页时，每份文档使用独立 ID。

提取的页面数据经结构化转换与 HTML 转义，不复制原页面 HTML、事件处理器或脚本。只允许 HTTP(S) 内容链接；图片嵌入仅接受 X 图片 CDN 的 PNG / JPEG / WebP / GIF，匿名读取、不跟随重定向。每张图片上限 8 MiB，单次读取总预算 32 MiB；3 路并发，每次请求 12 秒超时。图片读取失败会在界面与文档中明确标注，并保留原图链接。

API 依据：[Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)、[scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting)、[storage](https://developer.chrome.com/docs/extensions/reference/api/storage)。

## 开发

运行时代码使用原生 JavaScript / CSS，无生产依赖，无需打包器。开发需要 Node.js 20+，构建 ZIP 需要 `zip` 命令。

```sh
npm install
npm run build
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

如果本机已有用于自动化的 Chromium / Chrome for Testing，可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定可执行文件。浏览器自动化必须使用独立临时 profile，不使用个人 Chrome 资料。

```sh
npm run dev
# 打开 http://127.0.0.1:4173/preview.html?demo=1
```

`npm run dev` 仅提供示例页面预览；真实 X 内容提取需要加载扩展。开发后重新执行 `npm run build`，再到扩展管理页点击“重新加载”。

## 结构

```text
extension/
  manifest.json          Chrome 扩展声明
  popup.html / popup.js  当前页读取入口
  preview.html / .js     选择、排版、导出
  ui.css                 扩展界面
  document.css           正文与打印排版
  lib/extract.js         可被注入的独立 DOM 提取函数
  lib/document.js        结构化内容 → Markdown / 安全 HTML
  lib/assets.js          CDN 图片嵌入与失败记录
  lib/download.js        Chrome 文件下载
  lib/demo.js            本地示例
scripts/                 构建、语法检查、示例预览
tests/                   导出边界检查与浏览器场景
artifacts/               测试输出与截图（不进入扩展）
```

## 验证口径

单元检查覆盖 HTML 转义、危险链接、中文与 emoji、代码围栏、引用来源、嵌图失败标注和保留选项。

浏览器检查以隔离 Chromium 中的构造 X DOM 页面验证真正的 `chrome.scripting.executeScript`、会话存储、`chrome.downloads`、离线 HTML、排版预览与打印 PDF。为自动化页面注入，**仅临时测试构建**增加 X fixture 域名的 host 权限；发行构建保持 `activeTab`。测试跳过系统原生保存和打印对话框，用实际下载和 Chromium PDF 输出验证文件。测试依据：[Playwright Chrome extensions](https://playwright.dev/docs/chrome-extensions)。

已额外在用户登录的 Chrome 中核对指定真实帖子和关联长文，执行只读 DOM 提取并逐段比对正文。细节、结果与证据边界见 [VERIFICATION.md](VERIFICATION.md)。该核对与隔离扩展测试不能替代在用户个人 Chrome 中点击本项目工具栏图标、授予 `activeTab` 和操作系统打印窗口的最终验收。
