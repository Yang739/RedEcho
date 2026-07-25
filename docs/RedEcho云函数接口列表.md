# RedEcho 云函数接口列表

> 技术栈：微信小程序 + 微信云开发（云函数 Node.js + 云数据库 + 云存储 + AIGC）
> 约定：
> - 所有云函数统一返回 `{ code: 0, msg: 'ok', data: {...} }`，`code !== 0` 表示错误。
> - 鉴权：`WX_CONTEXT.OPENID` 取游客身份；工作人员函数额外校验 `role`（`roleOf` 查 `users._openid` + `role ∈ [field,actor,admin]`），越权返回 `403`。
> - **实时通道说明（重要）**：V1.0 **未接入**腾讯云 IM / WebSocket，实时性由房间页（`packages/show/pages/room`）以约 **2.6s** 周期轮询云函数 `getShowRoom` 实现——一次拉取演出状态、现场通知（notices）、弹幕流（stage，含工作人员 `source:'staff'` 与游客 `source:'visitor'`）、投票、情绪、剧情分支等全量数据，使场务指令与游客上行在客户端/大屏可见（延迟约 2.6s，属设计内降级方案）。**真·实时（< 1s）由 V2.0 的腾讯云 IM / WebSocket 通道承担**（独立实时服务仓库，不计入本软著小程序端）。
> - 标注「定时」的函数由云开发**定时器触发器**驱动（V2.0+ 规划）。

---

## 一、已实现云函数（V1.0，共 32 个）

> 下表为 V1.0 已落地、已部署的云函数，命名与 `cloudfunctions/` 目录一一对应，也与《软件说明书》第七章一致。

### 1.1 认证与用户（5）

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `login` | 游客登录态登记（首次自动建用户档案） | `code` | 公开 | 微信登录 API |
| `staffLogin` | 工作人员登录（手机号 + 密码），成功后回写 `users._openid` | `phone`, `password` | 公开 | `users` 集合 |
| `staffVerify` | 工作人员 token 校验（敏感操作前调用） | `phone`, `smsCode` | staff | - |
| `getUser` | 取 / 建用户档案（积分 / 等级 / 角色） | - | 登录 | - |
| `getUserProfile` | 个人中心信息（档案 + 积分 + 统计 + 订单聚合） | - | 登录 | 云存储（头像） |

### 1.2 首页与内容（1）

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `getHomeFeed` | 首页卡片 + 积分 + 今日积分 + 阅读 + 直播演出聚合 | - | 登录 | - |

### 1.3 演出场次（4）

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `getShows` | 场次列表（按 status 过滤：即将 / 进行中 / 已结束） | `status`, `page` | 登录 | - |
| `getShowRoom` | 场次详情 + 当前投票 + 分支 + 情绪类型 + 通知 + 弹幕流（V1.0 轮询核心读源） | `showId` | 登录 | - |
| `showReview` | 演出回顾（场次 + 我的投票 + 情绪分布 + 金句） | `showId` | 登录 | `polls` / `quotes` |
| `createShow` | 工作人员新建场次（自动邀请码，默认 `status:'upcoming'`） | `title`, `venue`, `date`, `gradient?`, `segment?`, `inviteCode?` | field / admin | `users`（roleOf） |

### 1.4 场务演出控制与现场运营（7）

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `showControl` | 翻转演出状态（开场 / 散场） | `showId`, `action`(open/close) | 场务 | - |
| `pollUpdate` | 开关投票 / 改题 / 改选项 | `questionId`, `question`, `options` | 场务 | - |
| `branchLock` | 根据投票锁定剧情分支走向 | `segmentId`, `branchKey` | 场务 | - |
| `inviteSet` | 设置 / 重置邀请码（服务端存储，不下发客户端） | `showId`, `inviteCode` | 场务 | - |
| `verifyInvite` | 邀请码核验（服务端读取，不下发客户端） | `showId`, `code` | 登录 | - |
| `noticePush` | 推送现场通知（写入 `notices` 集合） | `showId`, `text` | 场务 | - |
| `videoPush` | 弹幕 / 短片上舞台大屏（写 `stage`，`source:'staff'`） | `showId`, `text` | 场务 | - |

### 1.5 投票与情绪互动（5）

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `pollVote` | 游客投票（原子自增 + 一人一票校验） | `questionId`, `optionKey` | 登录 | `polls`（原子更新） |
| `submitEmotion` | 情绪反馈写库 | `showId`, `type` | 登录 | - |
| `emotionSend` | 情绪上舞台大屏 | `showId`, `type` | 场务 | - |
| `danmakuSend` | 游客弹幕上行（游客→大屏，写 `stage`，`source:'visitor'`，≤60 字） | `showId`, `text` | 登录 | - |
| `getBranch` | 分支进度查询 | `showId` / `segmentId` | 登录 | - |

### 1.6 演员 AI 台词（1）

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `aiLineGenerate` | 实时生成台词建议（结合环节 / 投票趋势 / 角色背景，流式；未配密钥时回退示例文本） | `showId`, `segmentId`, `actorId` | 演员 | 大模型 API |

### 1.7 AIGC 明信片（3）

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `postcardSceneList` | 场景模板列表 | - | 登录 | - |
| `postcardGenerate` | 调用文生图生成明信片（后处理合成字体 / 水印 / 留白；未配密钥时回退 CSS 渲染），落库排版参数 | `sceneId`, `quote`, `customText`, `orient`, `arrange`, `font`, `position`, `avatarFileID?` | 登录 | 文生图 API / 云存储 |
| `postcardList` | 我的明信片历史 | `page` | 登录 | 云存储 |

### 1.8 积分商城与兑换（4）

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `productList` | 商品列表 | `page`, `category` | 登录 | - |
| `createOrder` | 商城下单（生成核销码） | `productId`, `quantity` | 登录 | - |
| `getOrders` | 积分商城兑换订单 | `status`, `page` | 登录 | - |
| `orderRedeem` | 现场核销（校验核销码） | `redemptionCode` | 场务 | - |

### 1.9 数据看板（2）

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `getStatistics` | 运营数据看板聚合（当日游客 / 积分 / 热门卡片 / 兑换 Top） | `date` | 场务 | 聚合查询 |
| `dashboardShow` | 单场次运营明细（读 `polls` / `stage` / `emotions` 实时票数 / 弹幕 / 情绪） | `showId` | 场务 | - |

---

## 二、规划接口（V2.0+，未在 V1.0 建目录）

> 以下为早期设计 / 后续版本规划接口，**V1.0 未实现**。其中部分已被 V1.0 以「改名落地」的方式实现，已在备注中标明，避免与上文 32 个已实现函数混淆。

| 原规划名 | 状态 | 备注 |
|---|---|---|
| `authLogin` | 待补 | 游客手机号一键登录（V1.0 用 `login` 替代，以 openid 为主身份） |
| `cardList` / `cardDetail` / `cardLike` / `cardFavorite` | 待补 | 资料卡片此前端本地源（`services/resources.js`）提供，无需云接口 |
| `reportRead` / `pointsBalance` / `pointsHistory` | 待补 | 积分读写当前由 `getUser` / `getUserProfile` 承载，明细页本地读取 |
| `updateUserProfile` | 待补 | 资料编辑当前为本地演示存储 |
| `showList` / `showDetail` / `showJoin` | 待补 | 场次列表由 `getShows` 提供；IM 入群待 V2.0 |
| `showCreate` | 已落地 | V1.0 实现为 `createShow` |
| `showUpdate` | 待补 | 场次编辑（V1.0 暂未开放） |
| `segmentStart` / `segmentEnd` | 待补 | 环节级开关（V1.0 用 `showControl` 做开场 / 散场） |
| `pollStart` / `pollResult` | 待补 | 投票发布 / 结果由 `pollUpdate` / `getShowRoom` 承担（V1.0 轮询） |
| `emotionStats` / `videoGet` | 待补 | 大屏情绪统计、短片拉取（V1.0 由 `getShowRoom` / `dashboardShow` 下发） |
| `aiLineList` / `aiLineChoose` / `aiLineTTS` | 待补 | 台词本 / 选用标记 / TTS（V1.0 仅 `aiLineGenerate`） |
| `quoteList` / `sensitiveCheck` | 待补 | 名言库 / 敏感词（V1.0 客户端 `sensitive.js` 双校验） |
| `postcardShare` | 待补 | 分享卡片（V1.0 端上直接保存 / 分享） |
| `orderCreate` | 已落地 | V1.0 实现为 `createOrder` |
| `orderPay` / `orderCancel` | 待补 | 微信支付统一下单 / 退款（预留） |
| `orderList` | 已落地 | V1.0 实现为 `getOrders` |
| `dashboardDaily` | 待补 | 当日运营明细（V1.0 用 `getStatistics`） |
| `imUserSig` / `imCallback` | 待补 | 腾讯云 IM 用户签名 / 消息回调（V2.0 实时通道） |
| `taskDailyReset` 『定时』 | 待补 | 每日 0 点重置与生成统计 |
| `taskShowStatus` 『定时』 | 待补 | 定时扫描更新场次状态（V1.0 由 `showControl` 手动翻转） |

---

## 三、实时通信架构说明（V1.0 → V2.0）

- **V1.0（云函数轮询，约 2.6s）**：房间页 `setInterval` 周期调用 `getShowRoom` 拉取全量房间状态；场务经 `showControl` / `noticePush` / `videoPush` / `branchLock` 写库，游客经 `pollVote` / `emotionSend` / `submitEmotion` / `danmakuSend` 写库，均由 `getShowRoom` 轮询下发至客户端与工作人员端。指令→客户端可见延迟约 2.6s，属设计内降级方案。
- **V2.0（腾讯云 IM / WebSocket，目标 < 1s）**：每个场次一个 IM 群组（游客 + 演员 + 场务同群）；下行由云函数调 IM REST 推群消息，上行经 IM 私信 / 系统消息广播。该通道由独立实时服务仓库承担，不计入本软著小程序端代码。
- **SLA**：V1.0 轮询刷新约 2.6s（指令→客户端可见）；投票响应 < 500ms（原子自增）；明信片生成 < 10s（未配密钥时回退 CSS 渲染）。
