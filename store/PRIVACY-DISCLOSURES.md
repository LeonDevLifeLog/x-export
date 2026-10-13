# Chrome Web Store · Privacy practices 填写稿

对应版本：1.1.0。声明必须与提交的扩展代码、公开政策页面一致。扩展只在本机处理，并不等于“不处理用户数据”。

## Single purpose description

Export the X posts and articles that the user chooses from their already-loaded, signed-in X page into Markdown, standalone HTML, or PDF through Chrome printing. Processing occurs on the user's device.

中文：将用户在已登录 X 页面中主动选择的已加载帖子和长文，导出为 Markdown、独立 HTML，或通过 Chrome 打印保存 PDF。处理在用户设备上完成。

## Permission justifications

以下英文可分别复制到后台对应权限字段。

| 权限 | 英文填写稿 |
| --- | --- |
| activeTab | After the user clicks the extension, temporarily access the active X page to read the post/article they want to export. The active page URL is checked to enable this feature. No browsing history is read and no background page monitoring occurs. |
| scripting | Inject the packaged, read-only DOM extraction function into that user-selected X tab to obtain already-loaded post text, attribution, source URLs and media references. No permanent content script is installed and no remote JavaScript is executed. |
| storage | Use extension session storage for captured documents, edited titles and selected posts so the preview tab can render and export them. Use local storage for layout and language preferences only. No Chrome Sync is used. Users can clear temporary documents in Help & privacy. |
| downloads | Save the user-requested Markdown or standalone HTML file through Chrome's download API with a save dialog and a safe file name. No remote file is downloaded in the background. PDF is saved separately through Chrome printing. |
| https://pbs.twimg.com/* (optional host access) | When the user chooses HTML/PDF export with images, request access only to X's image CDN to fetch and embed those images for offline reading. Fetches use HTTPS, omit credentials and referrers, accept raster image types only, and reject redirects. If permission is denied or an image fails, export still includes text and an original-image link. No other host access is permanently requested. |

中文说明：activeTab 临时读取用户当前 X 页；scripting 注入本地只读提取函数；storage 保存会话文档和本机偏好；downloads 保存用户主动要求的 MD/HTML；pbs.twimg.com 为嵌图使用的按需可选权限，可拒绝。没有 tabs、cookies、history 或全站 host 权限。

## Remote code

选择 **No, I am not using remote code**。

说明：All executable JavaScript and CSS is included in the extension package. The only remote resources used by the extension are image data from pbs.twimg.com. Images are not executed as code. No CDN scripts, remote fonts, eval, remote modules or backend code are used.

## Data usage

按当前官方 FAQ，“读取网页内容并仅在本机处理”也属于需披露的数据处理。后台选项命名可能变化，按定义匹配，建议如下：

| 数据类别 | 填写依据 |
| --- | --- |
| Website content | 读取用户选择的已加载帖子/长文正文、图片引用、引用文字和日期，用于导出。 |
| Personally identifiable information | 作者显示名称与账号可能属于可识别信息，作为归属信息保留；不读取已登录用户的账号设置或联系方式。 |
| Web history / web browsing activity | 仅当前被导出的 X 页面 URL 和图片资源 URL。不是浏览器历史数据库，不监控其他页面；FAQ 将网站访问 URL 也纳入浏览活动。 |

不要声明扩展读取 Authentication information、Financial/payment information、Health information、Location、Personal communications（私信/聊天）或 User activity（键击/鼠标跟踪）：代码不采集这些类别。用户选择的任意正文可能包含私人信息，不对正文作检测或分类，导出前由用户核对。

英文补充说明：Page content, author attribution and the selected X source/image URLs are processed locally for the user-requested export. They are not transmitted to the developer. Preview images and explicit image embedding contact X's CDN, which receives the requested image URL and ordinary network information. No browsing history database, private messages, authentication credentials, analytics, ads or telemetry are accessed.

按真实实现勾选后台关于“不出售或转移用户数据”“仅用于单一用途”“不用于信用/贷款判断”的认证。图片 CDN 请求已经在隐私政策中披露。不要把“不会上传开发者”描述为“完全无网络请求”。

## Privacy policy URL

[https://leondevlifelog.github.io/x-export/privacy.html](https://leondevlifelog.github.io/x-export/privacy.html)。源页面为 `site/privacy.html`，中英文完整政策亦随扩展打包。提交前检查无需登录即可访问，并确认对应本版本。

`metadata.json` 已填写 GitHub Pages 的政策、支持页和首页 URL。支持页使用公开仓库的 GitHub Issues 作为联系入口；Issue 公开可见，页面提醒用户不要发送账号凭据或私密导出文件。

## 官方依据

核对日期：2026-10-13。

- [Privacy practices 字段](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [User Data FAQ：本机处理也需披露与隐私政策](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [User Data policy](https://developer.chrome.com/docs/webstore/program-policies/user-data)
