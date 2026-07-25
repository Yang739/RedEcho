# RedEcho 部署指南

本目录包含两个内容：
- `README.md`：完整部署步骤（小程序代码 + 云函数）
- `upload.js`：基于 `miniprogram-ci` 的小程序代码命令行上传骨架

> ⚠️ 部署是**人工动作**，需要你自己在微信开发者工具或命令行完成。代码不会自动上传。
> 部署前必须先用真实 AppID 开通云开发环境，并把环境 ID 填入根目录 `config.js` 的 `ENV`。

---

## A. 小程序代码上传

### 方式一：微信开发者工具（推荐，零配置）
1. 打开微信开发者工具，导入项目根目录 `RedEcho/`，AppID 使用项目内置（已在 `project.config.json` 配置）。
2. 确认 `config.js` 的 `ENV` 已替换为真实云环境 ID（见下「部署前检查清单」）。
3. 点击工具栏 **「上传」** 按钮，填写版本号与备注，提交为「开发版」。
4. 在 **微信公众平台 → 管理 → 版本管理** 中：
   - **真机预览 / 体验版**：把开发版设为体验版，邀请成员扫码体验。
   - **审核发布**：提交审核，审核通过后发布为线上版本。

### 方式二：miniprogram-ci 命令行（CI / 自动化）
适合接入流水线，无需打开开发者工具。
1. 安装依赖：
   ```bash
   npm install
   ```
2. 到 **微信公众平台 → 开发管理 → 开发设置 → 上传密钥**，下载私钥 `private.xxx.key`。
   - 私钥等同于账号权限，**切勿提交到 git**，建议放在项目外的目录（如 `keys/` 并已加入 `.gitignore`）。
3. 编辑 `deploy/upload.js`，修改：
   - `PRIVATE_KEY_PATH`：你的私钥文件路径
   - `VERSION`：本次版本号（每次上传递增）
   - `DESC`：上传备注
   - `APPID`：无需手填，`upload.js` 会自动从 `project.config.json` 读取
4. 执行上传：
   ```bash
   npm run deploy
   # 等价：node deploy/upload.js
   ```
   > `upload.js` 只上传前端代码（主包 + 分包），云函数需按下方 B 单独部署。

---

## B. 云函数部署

云函数（位于 `cloudfunctions/`）**不能**用上面的小程序上传通道部署，需逐个部署：

### 方式一：微信开发者工具（推荐）
1. 在开发者工具左侧「云开发」面板确认环境已开通。
2. 右键 `cloudfunctions/` 下**每一个函数目录**，选择 **「上传并部署：云端安装依赖」**（推荐，云端自动 `npm install`）。全部函数（32 个）须逐个部署，分组如下：

   **① 游客端核心（14）**：login、getUser、getHomeFeed、getShows、getShowRoom、danmakuSend、pollVote、submitEmotion、getBranch、aiLineGenerate、postcardGenerate、createOrder、getOrders、getStatistics
   **② 内容 / 数据（7）**：postcardList、postcardSceneList、showReview、getUserProfile、staffVerify、verifyInvite、productList
   **③ 工作人员 / 管控（11）— 极易漏部署，必须确认已上传**：staffLogin（角色链回写 `_openid`，未部署会导致所有管控 403）、showControl、createShow、pollUpdate、inviteSet、noticePush、branchLock、videoPush、emotionSend、dashboardShow、orderRedeem

   > ⚠️ 以往部署清单只列了第 ① 组 13 个游客函数，漏掉全部工作人员函数，是「工作人员无操作权限（403）」最常见的根因。请务必把 ③ 组 11 个函数也逐一上传。
3. 每个云函数为**自包含目录**（公共初始化已内联，无共享 `common/` 模块），请逐个右键上传。

### 方式二：命令行（Serverless 工具 / miniprogram-ci 暂不直接支持单函数上传）
微信官方 `miniprogram-ci` 目前主要面向「小程序代码上传」，云函数部署建议用开发者工具或云开发 CLI（`tcb`）。如要走全命令行，可后续引入云开发 CLI 批量上传 `cloudfunctions/*`。

---

## 部署前检查清单

- [ ] **AppID** 正确：`project.config.json` 中 `appid` 已就位（勿改）。
- [ ] **云环境已创建**：在微信开发者工具「云开发」中开通环境，复制环境 ID。
- [ ] **ENV 已填**：根目录 `config.js` 的 `ENV` 已从占位符 `your-cloud-env-id` 改为真实环境 ID。
- [ ] **npm 依赖已装**：在 `cloudfunctions/<每个函数>/` 执行 `npm install`（或在开发者工具选「云端安装依赖」）。
- [ ] **云函数已部署**：全部 32 个函数均已「上传并部署」（见 B，重点确认 ③ 组工作人员/管控函数已上传；新增的 ① 组 `danmakuSend` 游客弹幕上行也须部署）。
- [ ] **私钥已就位**（仅命令行方式）：`deploy/upload.js` 的 `PRIVATE_KEY_PATH` 指向有效私钥。
- [ ] **`.workbuddy/` 未改动**：部署包中不应包含该目录（已在 `upload.js` 的 ignores 中排除）。

---

## 验证部署

1. 真机/模拟器打开小程序，首页能拉到数据（云模式）或正常显示 mock（ENV 仍是占位符时）。
2. 进入「演出」页能列出场次；进入房间能投票、发送情绪。
3. 「创作」页能生成明信片（文生图为占位，返回配置即可）。
4. 「我的」页能下单并查到订单。

---

## 集合种子导入

> 本节约等于「云数据库集合创建 + 种子数据导入」的人工步骤。种子文件均为 **JSONL**（每行一个完整 JSON 对象，无顶层数组），位于 `tools/` 下。本轮新增 `polls-seed.json` / `quotes-seed.json` / `users-staff-seed.json` 三个种子（详见《云开发完整性审查报告》）。

### 1. 需创建的 15 个集合

在微信开发者工具「云开发 → 数据库」中新建以下 15 个集合（名称严格一致）：

| 集合名 | 写入方 | 读取方 | 是否需预灌种子 |
|---|---|---|---|
| `users` | login/getUser/staffLogin 等 | 多函数（roleOf） | 是（工作人员行） |
| `shows` | getShows/showControl/pollUpdate/branchLock/inviteSet | getShowRoom/showReview 等 | 是（含 inviteCode） |
| `polls` | pollVote（原子 _.inc） | getShowRoom/pollVote | 是（每场 open:true） |
| `vote_records` | pollVote | — | 否 |
| `pollVotes` | （无写入方，看板读源待修复 P1-⑤） | dashboardShow | 否 |
| `emotions` | emotionSend | dashboardShow | 否 |
| `emotion_feedbacks` | submitEmotion | showReview | 否 |
| `branch_log` | （无写入方，getShowRoom/getBranch 读源待修复 P1-⑤） | getShowRoom/getBranch | 否 |
| `stage` | videoPush（source:'staff'）/ danmakuSend（source:'visitor'） | getShowRoom / dashboardShow | 否 |
| `notices` | noticePush | getShowRoom（已读取，空则回退默认提示） | 否 |
| `postcards` | postcardGenerate | getUserProfile（计数） | 否 |
| `orders` | createOrder | getUserProfile/getStatistics/getOrders | 否 |
| `favorites` | （无云写入方，P2-③） | getUserProfile（计数） | 否 |
| `mall_orders` | orderRedeem | — | 否 |
| `quotes` | （无写入方） | showReview（随机采样） | 是 |

### 2. 种子文件 → 目标集合映射

| 种子文件（tools/） | 目标集合 | 说明 |
|---|---|---|
| `shows-seed.json`（既有） | `shows` | 4 场 JSONL，每条含 `inviteCode` |
| `polls-seed.json`（本轮新增） | `polls` | 每场一行 `open:true` 投票文档，`options` 各项 `votes:0` |
| `quotes-seed.json`（本轮新增） | `quotes` | 4 条金句，回顾页 `aggregate().sample()` 随机抽 |
| `users-staff-seed.json`（本轮新增） | `users` | 按 `phone` 登录的 admin/field/actor 三行；**不含 `_openid`** |

### 3. 控制台 JSONL 导入步骤

1. 在「云开发 → 数据库 → 对应集合」点击 **「导入」**。
2. 选择 `tools/` 下对应种子文件，**文件格式选「JSON」**，编码 UTF-8。
3. `users-staff-seed.json` 现已为纯 JSONL（无注释行），可直接导入；角色链断裂说明见下方第 4 节。
4. 其余文件均为纯 JSONL，可直接导入。
5. 重复 1–4 完成 4 个文件导入（`shows` / `polls` / `quotes` / `users`）。

> 字段约束（云数据库）：文档字段名**不能含 `.` 或 `$`**；**不能以 `_` 开头**（除系统保留的 `_id` / `_openid` 外）。本批种子仅用 `phone`/`password`/`role`/`name`/`showId`/`open`/`question`/`options`/`text`/`label`/`votes`/`id` 等常规字段，未带 `_id`，且字段名均无 `.`/`$`、非 `_` 开头，满足约束。

### 4. 角色链注意事项（重要）

- 工作人员按 **`phone` + `password`** 登录（`api.staffLogin` → 云函数 `staffLogin` 查 `users` 集合 `{phone, password, role}`）。本种子满足了「登录查表」。
- **但**：云模式下所有工作人员**管控**动作以 `roleOf(OPENID)`（`users._openid` + `role` → 角色）鉴权。本种子按 `phone` 建、**不含 `_openid`**（控制台导入文档不会自动获得微信 openid）。
- 结论（代码已修复，关键在于部署）：`staffLogin` 已在登录成功时把 `OPENID` 回写 `users._openid`（commit a8bce65）；所有管控函数的 `roleOf` 也已限定 `role ∈ [field,actor,admin]`，排除「游客无 role 文档」导致的误命中（防双文档坑）。**但这两个修复必须经「上传并部署」到云端才生效**；部署后工作人员须**退出重新登录一次**触发 `_openid` 回写，之后管控才可用。本地 mock 不受影响（mock 不查云端 `users`）。详见《云开发完整性审查报告》P1-⑦。
