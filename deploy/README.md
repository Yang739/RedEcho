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
2. 右键 `cloudfunctions/` 下**每一个函数目录**（login、getUser、getHomeFeed、getShows、getShowRoom、pollVote、submitEmotion、getBranch、aiLineGenerate、postcardGenerate、createOrder、getOrders、getStatistics）：
   - 选择 **「上传并部署：云端安装依赖」**（推荐，云端自动 `npm install`）。
3. 每个云函数为**自包含目录**（公共初始化已内联，无共享 `common/` 模块），请逐个右键上传。

### 方式二：命令行（Serverless 工具 / miniprogram-ci 暂不直接支持单函数上传）
微信官方 `miniprogram-ci` 目前主要面向「小程序代码上传」，云函数部署建议用开发者工具或云开发 CLI（`tcb`）。如要走全命令行，可后续引入云开发 CLI 批量上传 `cloudfunctions/*`。

---

## 部署前检查清单

- [ ] **AppID** 正确：`project.config.json` 中 `appid` 已就位（勿改）。
- [ ] **云环境已创建**：在微信开发者工具「云开发」中开通环境，复制环境 ID。
- [ ] **ENV 已填**：根目录 `config.js` 的 `ENV` 已从占位符 `your-cloud-env-id` 改为真实环境 ID。
- [ ] **npm 依赖已装**：在 `cloudfunctions/<每个函数>/` 执行 `npm install`（或在开发者工具选「云端安装依赖」）。
- [ ] **云函数已部署**：全部 17 个函数均已「上传并部署」（见 B）。
- [ ] **私钥已就位**（仅命令行方式）：`deploy/upload.js` 的 `PRIVATE_KEY_PATH` 指向有效私钥。
- [ ] **`.workbuddy/` 未改动**：部署包中不应包含该目录（已在 `upload.js` 的 ignores 中排除）。

---

## 验证部署

1. 真机/模拟器打开小程序，首页能拉到数据（云模式）或正常显示 mock（ENV 仍是占位符时）。
2. 进入「演出」页能列出场次；进入房间能投票、发送情绪。
3. 「创作」页能生成明信片（文生图为占位，返回配置即可）。
4. 「我的」页能下单并查到订单。
