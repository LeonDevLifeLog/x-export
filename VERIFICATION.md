# 验证记录

日期：2026-10-13。使用前提：当前 Chrome 已登录 X，扩展读取当前页面中账号可见的内容。

## 本地扩展链路

版本：1.1.0。隔离 Chromium 148 加载临时测试扩展，19 个浏览器场景通过，无 JavaScript 错误。9 个导出与国际化单元检查通过。覆盖：

- 通过真实 `chrome.scripting.executeScript` 读取页面，通过 `chrome.storage.session` 打开预览。
- 手动选入同作者发文、修改标题、刷新恢复设置。
- Markdown 使用真实 `chrome.downloads` 下载；中文、emoji、换行、链接、引用、代码和图片 URL 保留。
- HTML 嵌入配图后，在阻断网络的浏览器页中可打开；图片失败有明确标注与原图链接。
- 三种主题、375px 窄屏排版，无横向溢出；检查实际截图。
- PDF 操作等待图片完成后调用打印，A4 样式隐藏扩展界面；长文自动分页。
- 折叠正文阻止导出，过期预览提供重新读取指引。

自动化中仅临时测试副本授予 X fixture 域名 host 权限，以代替工具栏的 `activeTab` 用户手势。发行 manifest 保持临时 `activeTab` 权限。原生保存与打印窗口未由自动化实际操作；下载使用 Chrome API，PDF 用 Chromium 打印输出检查。可选图片权限 API 的允许/拒绝结果由自动化替代，临时测试构建预先授予图片 CDN 权限；发行构建仅声明 optional_host_permissions。未把替代结果宣称为原生权限对话框验收。

测试文件、截图与报告在 `artifacts/`，不进入扩展 ZIP。

PDF 文件内容解析确认：普通样例为 2 页，50 段分页样例为 6 页，均为 A4；全部 50 段编号完整，没有导出设置、主题控制等编辑界面文字。检查了实际 PDF 的第一页渲染。

## 商店 MVP 与材料

- en / zh_CN 消息键和动态参数一致，manifest 名称/短描述满足 Chrome 长度限制。插件内语言切换保留原文、修改后的标题和选项；插件名称由 Chrome 自身界面语言决定。
- 英文 MD/HTML 使用真实下载 API，HTML 的 lang、日期、阅读信息、页脚等辅助文字采用英文。中文与 emoji 原文不被翻译。375px 窄屏无横向溢出，英文弹窗不超过 Chrome 的 600px 高度。
- Markdown 不请求图片权限；HTML 权限拒绝时仍保存文字并明确保留原图链接。PDF 原生流程另有下述隔离配置验证。
- 帮助页清除 doc 会话记录，已打开预览随即失效且清空正文/元数据；排版与语言偏好保留。
- 商店素材从未增加权限的发行构建生成，中英文各 5 张 1280×800 实际界面截图；128px 图标检查了每边 16px 透明留白；两张宣传图为 440×280 / 1400×560。所有素材使用原创示例。检查了实际渲染，网站草稿在 375px 下无横向溢出。
- store:check 通过：版本一致、ZIP 根 manifest、文件树及内容与源码一致、必需/可选权限白名单、语言消息引用、素材尺寸、截图源文件摘要、隐私正文及网站内链一致。报告在 dist/webstore-check.json。
- 公开政策及支持 URL 已按后续发布要求填写到 metadata，GitHub Pages 部署结果单独核对。开发者账户、审核 X 测试账号（如被要求）、个人 Chrome 的线上完整导出与未覆盖的系统交互仍为提交前外部步骤。未上传商店、未提交审核、未声称获得批准。

## GitHub Pages 公开发布

2026-10-13 18:16（Asia/Shanghai）确认：仓库公开且 Issues 可用，GitHub Pages 使用 workflow 发布、启用 HTTPS。部署提交为 `4534a82430c9fcd6a6944a0be6fa914bda3940e3`，[部署任务](https://github.com/LeonDevLifeLog/x-export/actions/runs/38382002477)结果为 success。部署目录仅为 `store/site`，包含首页、双语政策、支持页和样式；扩展、测试与 artifacts 不在该部署中。

- [公开政策](https://leondevlifelog.github.io/x-export/privacy.html)、首页、支持页和 CSS 的匿名 HTTPS 请求均为 200；逐文件字节与本地发布源相同。
- 公共政策正文与扩展随包政策一致，仅帮助导航指向网站支持页。联系入口已更新为公开 GitHub Issues，匿名请求为 200。
- 隔离且未登录的 Chrome 检查三页实际渲染和站内链接。英文与简体中文政策段落均存在，375px 下无横向溢出，无 JavaScript 错误；查看了桌面和中文窄屏截图。
- `store/metadata.json` 的 policy/support/homepage URL 已补全；扩展包、素材源摘要和移交包已重新生成，`store:check` 通过。原有 9 项单元、19 项浏览器及原生操作记录保留其原始验证范围；这次仅改政策联系入口与发布材料，没有改导出执行代码。

匿名 HTTP 比对记录在 `artifacts/pages-http-verification.json`，浏览器记录在 `artifacts/pages-browser-verification.json`，公开页面截图在 `artifacts/pages-*-desktop.png` / `pages-*-mobile.png`。页面发布是网站托管完成的证据，不代表 Chrome Web Store 已提交或获批。

## 开发者介绍

后续“关于开发者”界面变更：隔离 Chrome 加载发行扩展，分别用英文及简体中文从弹窗“关于”打开 `help.html#about-developer`。GitHub 主页与仓库的匿名请求均为 200，外部链接使用新标签页及 `noopener noreferrer`。376×600 弹窗与 375px 帮助页无横向溢出，无 JavaScript 错误，查看了实际界面截图。记录为 `artifacts/about-verification.json`；本次没有改导出逻辑，原有导出验证保留原始范围。

## 原生工具栏、权限与 PDF 保存

在 macOS arm64 的 Chrome for Testing 148.0.7778.96 中，使用新建的隔离 profile 加载发行扩展。逐文件确认其与 `dist/x-export` 相同，没有修改 manifest，也没有替代权限或 tabs API。X 页面和图片 CDN 响应使用构造 fixture；未使用个人浏览器资料或真实账号。

- 新安装的图片 CDN 权限为未授予。通过真实工具栏扩展入口点击“读取当前发文”，`activeTab` 成功读取当前帖子，预览默认只选当前发文。
- 第一次 HTML 导出在 Chrome 原生图片权限窗口点击“拒绝”，实际下载文件保留文字、图片失败说明与原图链接。
- 再次导出在原生窗口点击“允许”，权限查询确认已授予；实际下载 HTML 包含图片 data URI，没有失败说明。
- PDF 导出打开真实 Chrome 打印窗口，选择“另存为 PDF”、关闭页眉页脚并启用背景图形。通过 macOS 保存窗口保存实际 PDF。解析确认 1 页 A4、中文与 emoji 正文完整、无编辑控制及扩展 URL 页眉。

记录为 `artifacts/native-verification.json`，打印窗口截图为 `artifacts/native-print-dialog.png`，实际文件为 `artifacts/native-browser.pdf` 与两份 `native-*.html`。测试结束关闭浏览器并移除该隔离 profile。此轮 MD/HTML 下载仍由 Playwright 接收，因此不宣称覆盖了它们的原生保存窗口；权限撤销后重试也仍需人工确认。自动化报告保持原来的替代条件标记，两类证据分别记录。

## 真实线上 X 页面核对

以下是同一项目初版已完成的只读页面核对。本版本通过对应 DOM 回放继续回归，没有把本次隔离浏览器测试描述为重新执行个人 Chrome 的线上导出。

通过用户已登录的 Chrome 读取以下真实页面，并在页面中执行只读 DOM 提取逻辑：

| 页面 | 验证结果 |
| --- | --- |
| [用户提供的 WquGuru 帖子](https://x.com/wquguru/status/2109458639501271530) | 完整 274 字符正文、作者 WquGuru、账号 wquguru、发布时间 `2026-10-12T01:38:26.000Z`、2 个 @yetone 链接、1 张正文图片。已展开，无折叠提示。 |
| [关联长文](https://x.com/wquguru/status/2109650264601117141) | 标题“yetone 的魔法：magpie 是怎么让 AI 自己维护项目的”；71 个内容块，8 个标题、45 个段落、7 个引用块（含内嵌发文）、4 组列表、2 个代码块、5 张配图（封面 + 4 张正文图）。逐段检查 78 个非内嵌发文的源文本片段，没有遗漏。 |

长文中的内嵌发文图片与互动数字不加入正文配图。视频仅保留原文查看链接。长文在 Chrome 中通过帖子卡片实际导航到 `/wquguru/status/2109650264601117141`；直接访问 `/i/article/...` 在该浏览器里返回主页，因此使用真实卡片目标验证。

另观察到公开页面使用无 `data-testid` 的语义 `article`、`dir="auto"` 与 `whitespace-pre-wrap` 结构，已经加入相应兼容与回归场景。用户登录页面目前仍使用传统 `data-testid` 结构，两种结构都覆盖。

用户指定帖子的精简登录页面 DOM 已加入 `tests/fixtures/logged-in-post.html` 回归校验。另从真实 X 图片 CDN 读取该帖配图，结合真实正文生成 `artifacts/user-post.md`、`user-post.html`、`user-post.pdf`；HTML 图片嵌入后在阻断网络的页面中仍能打开。这份样张由真实 DOM 回放生成，不宣称是在个人 Chrome 点击扩展导出的文件。

## 证据边界

真实页面验证证明当前这两个页面的 DOM 提取兼容性；隔离浏览器验证证明扩展导出链路。尚未在用户个人 Chrome 中加载本项目扩展、点击工具栏授予 `activeTab` 并通过系统打印窗口保存，因此不把两类证据合并宣称为个人 Chrome 的完整验收。

安装后最终验收：在已登录的 Chrome 中打开用户提供的帖子 → 点击本扩展 → 确认正文到末尾的 😄、作者与 1 张图片 → 分别保存 MD、HTML、PDF；再用关联长文核对标题、配图、代码与分页。
