# Chrome Web Store 提交指南 · X Export 1.1.0

本目录是提交材料，不代表已向商店提交。源码仓库现已公开，政策及支持页面通过 GitHub Pages 发布。

## 文件对应关系

| 后台字段 / 用途 | 文件 |
| --- | --- |
| Upload package | `dist/x-export-v1.1.0.zip`，manifest 位于 ZIP 根目录；只上传这个扩展包 |
| 名称、短描述、语言、单一用途 | `metadata.json`，名称/短描述与 manifest 双语目录一致 |
| 英文详细描述 | `listing/en.txt` |
| 简体中文详细描述 | `listing/zh_CN.txt` |
| Store icon | `assets/icon-128.png`，128×128 PNG，96px 图形 + 每边 16px 透明留白 |
| 全局小宣传图 | `assets/promo-small-440x280.png`，440×280 PNG |
| 可选大宣传图 | `assets/promo-marquee-1400x560.png`，1400×560 PNG |
| 英文截图（5 张） | `assets/en/`，每张 1280×800 PNG |
| 简体中文截图（5 张） | `assets/zh_CN/`，每张 1280×800 PNG |
| Privacy practices | `PRIVACY-DISCLOSURES.md`：单一用途、权限、远程代码、数据类别 |
| Test instructions | `REVIEWER-INSTRUCTIONS.md`：免登录示例 + 真实 X 验证步骤 |
| 可托管的首页 / 政策 / 支持页 | `site/index.html`、`site/privacy.html`、`site/support.html`、`site/site.css` |

截图来自发行扩展的实际界面，使用本项目原创示例，不含个人登录资料或他人文章。截图建议顺序：paper → minimal → midnight → markdown → help。全局宣传图不随语言切换；本包采用英文品牌文案。YouTube 宣传视频暂未制作，MVP 不依赖视频；以后台实际字段要求为准。

## 公开网址

- Privacy policy URL：[https://leondevlifelog.github.io/x-export/privacy.html](https://leondevlifelog.github.io/x-export/privacy.html)。包含英文与简体中文。
- Support URL：[https://leondevlifelog.github.io/x-export/support.html](https://leondevlifelog.github.io/x-export/support.html)。支持入口为公开仓库的 [GitHub Issues](https://github.com/LeonDevLifeLog/x-export/issues)。
- Homepage URL：[https://leondevlifelog.github.io/x-export/](https://leondevlifelog.github.io/x-export/)。扩展尚未上架，首页没有虚构商店链接。

上述网址已写入 `metadata.json`。发布源为 `site/`，由仓库 `.github/workflows/pages.yml` 自动部署；公开政策与扩展随包政策正文一致。提交前再在未登录浏览器检查这些 HTTPS 页面。网站发布不代表商店审核通过。

## 提交前由发布者补充

- 注册/确认 Chrome Web Store 开发者账户、一次性注册费用、二步验证、联系邮箱及后台要求的身份/地址信息。这些账户状态尚未检查。
- 如审核要求登录凭据，在审核专用字段提供独立 X 测试账号。代码无需开发者 API Key，但真实页面读取需 X 登录态。
- 上架后在首页添加真实商店链接；若希望使用支持邮箱，可同时更新支持页与政策联系段落。

## 打包与检查

```sh
npm ci
npm run check
npm test
npm run test:browser
npm run build
npm run store:assets
npm run store:check
npm run store:bundle
```

自动化需要 Playwright Chromium；本机已有浏览器可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定。所有浏览器脚本只使用隔离 profile。`store:check` 对 ZIP 文件树、源码一致性、版本/权限/双语、图片尺寸和材料文件进行检查，并生成 `dist/webstore-check.json`。网址未填写时报告 pendingExternalFields，而不虚报已经可提交。

`store:bundle` 输出 `dist/x-export-webstore-v1.1.0.zip`，便于移交全部材料；**这是移交包，不可作为扩展包上传商店**。该包中另含真正可上传的 `x-export-v1.1.0.zip` 和 SHA256SUMS。商店包不包含素材、测试、开发依赖或用户样张。

## 人工验收

加载发行目录 `dist/x-export`，在当前登录 X 的 Chrome 上逐项确认：

1. 工具栏点击触发 activeTab，单帖和长文全文读取完整；默认只选择当前发文。
2. 全新安装时图片权限默认未授予；MD 不申请该权限。HTML/PDF 嵌图首次允许、拒绝、撤销后的流程均可用。
3. MD/HTML 的原生保存窗口和下载文件；HTML 嵌入的图片离线可读，失败链接明确；PDF 原生打印窗口能保存 A4 文档且没有编辑界面。
4. 中文/英文自动选择及手动切换，窄窗口、键盘焦点、取消下载后重试、折叠正文恢复。
5. 临时数据清除使已有预览失效；浏览器关闭后不能恢复旧预览。

隔离 Chrome 已实际验证发行扩展的工具栏读取、原生图片权限允许/拒绝与原生 PDF 打印保存；该轮仍使用构造页面。MD/HTML 原生保存窗口、权限撤销后的重试及个人登录 Chrome 的线上完整流程仍需发布前确认。自动化验证范围和替代条件见项目 `VERIFICATION.md`。

## 后台操作

1. 进入 [开发者后台](https://chrome.google.com/webstore/devconsole)，Add new item，上传扩展 ZIP。
2. 确认版本和 en / zh_CN 两种语言。分别粘贴长描述与上传对应截图；上传全局图标和小宣传图。分类建议 Tools；若后台分类名称调整，选择文档/效率工具对应项。
3. 按 `PRIVACY-DISCLOSURES.md` 填单一用途、四个必需权限、图片 CDN 可选权限、无远程代码、数据处理与公开政策 URL。
4. 填免费分发、目标地区、支持链接与审核说明。默认不勾选成人内容；扩展内置示例不含成人内容，仍由发布者按实际条目判断。
5. 再核对实际商店预览、中英文描述一致、公开网址可访问。提交审核建议选择通过后手动发布，便于最后一次检查。

## 官方依据

核对日期：2026-10-13；后台字段及政策可能更新。

- [准备与发布](https://developer.chrome.com/docs/webstore/publish)
- [商店 listing 与国际化](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [图标、宣传图与截图规范](https://developer.chrome.com/docs/webstore/images)
- [隐私字段](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [本机数据也需披露](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [开发者注册](https://developer.chrome.com/docs/webstore/register)
