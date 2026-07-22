# RedEcho 云函数接口列表

> 技术栈：微信小程序 + 微信云开发（云函数 Node.js + 云数据库 + 云存储 + 腾讯云 IM）
> 约定：
> - 所有云函数统一返回 `{ code: 0, msg: 'ok', data: {...} }`，`code !== 0` 表示错误。
> - 鉴权：`WX_CONTEXT.OPENID` 取游客身份；工作人员函数需额外校验 `staff_verified` 与 `staff_types`。
> - 实时类（投票/台词/表情/短片）由云函数调用**腾讯云 IM REST API** 向群组推送，游客端通过 IM SDK 接收，延迟 < 1s。
> - 标注「定时」的函数由云开发**定时器触发器**驱动。

---

## 一、认证与用户

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `authLogin` | 游客微信手机号一键登录（code2Session + 获取手机号，落库/返回 token） | `code`, `encryptedData`, `iv` | 公开 | 微信登录 API |
| `staffLogin` | 工作人员登录（手机号+密码 或 手机号+验证码） | `phone`, `password` / `code` | 公开 | 验证码表 |
| `staffVerify` | 工作人员双因子二次验证（敏感操作前调用） | `phone`, `smsCode` | staff | - |
| `getUserProfile` | 获取个人中心信息（积分/等级/角色） | - | 登录 | - |
| `updateUserProfile` | 更新昵称/头像/字号偏好 | `nickname`, `avatarUrl`, `fontScale` | 登录 | 云存储 |

## 二、首页资料卡片 / 积分

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `cardList` | 卡片列表（分页/分类/关键词） | `page`, `size`, `tag` | 登录 | - |
| `cardDetail` | 卡片详情 | `cardId` | 登录 | - |
| `cardLike` | 点赞/取消点赞 | `cardId`, `action` | 登录 | - |
| `cardFavorite` | 收藏/取消收藏 | `cardId` | 登录 | - |
| `reportRead` | 上报阅读完成，发积分（校验每日上限50） | `cardId`, `duration` | 登录 | 积分流水 || `pointsBalance` | 积分余额与等级 | - | 登录 | - |
| `pointsHistory` | 积分明细（分页） | `page`, `size` | 登录 | - |

## 三、演出场次（游客端）

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `showList` | 场次列表（按状态筛选：即将/进行中/已结束） | `status`, `page` | 登录 | - |
| `showDetail` | 场次详情 + 当前环节 + 演员表 | `showId` | 登录 | - |
| `showJoin` | 游客加入演出（加入 IM 群组） | `showId` | 登录 | 腾讯云 IM |
| `showReview` | 演出回顾（剧情总结 + 个人选择路径） | `showId` | 登录 | 投票/分支表 |

## 四、场务演出管理

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `showCreate` | 创建场次（含预设环节/投票配置） | `title`,`theme`,`startTime`,`segments[]` | 场务 | - |
| `showUpdate` | 编辑场次信息 | `showId`, 字段... | 场务 | - |
| `showControl` | 环节总控：按序触发 开始投票/播放短片/结束 | `showId`, `segmentId`, `action` | 场务 | IM 推送 |
| `segmentStart` | 开始某环节 | `segmentId` | 场务 | IM |
| `segmentEnd` | 结束某环节 | `segmentId` | 场务 | IM |
| `pollUpdate` | 实时临时修改题目/选项 | `questionId`, `question`, `options` | 场务 | - |
| `branchLock` | 根据投票锁定剧情分支 | `segmentId`, `branchKey` | 场务 | - |
| `videoPush` | 上传并推送历史短片给全体游客 | `segmentId`, `fileID`(云存储) | 场务 | 云存储/IM |
| `activityStart` | 发起现场答题抽奖 | `segmentId`, `question`, `answer` | 场务 | IM |
| `activityJudge` | 自动判分并发放积分 | `segmentId` | 场务(定时/手动) | 积分流水 |
| `showHistory` | 历史演出数据（投票详情/分支回放） | `showId`, `page` | 场务 | - |

## 五、投票互动（实时）

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `pollStart` | 场务发布投票（推送至 IM 群组） | `segmentId`, `questionId` | 场务 | IM |
| `pollVote` | 游客限时投票（一人一票校验） | `questionId`, `optionKey` | 登录 | IM 广播 |
| `pollResult` | 实时结果（柱状图/弹幕数据） | `questionId` | 登录 | - |
| `emotionSend` | 发送表情/快捷短语（可上大屏） | `showId`, `type`, `content`, `toScreen` | 登录 | IM |
| `emotionStats` | 表情统计（大屏用） | `showId` | 场务/大屏 | - |
| `videoGet` | 游客获取当前推送短片地址 | `segmentId` | 登录 | 云存储 |

## 六、演员 AI 台词助手

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `aiLineGenerate` | 实时生成台词建议（结合环节/投票趋势/角色背景，流式） | `showId`, `segmentId`, `actorId` | 演员 | 大模型 API |
| `aiLineList` | 台词本（历史场次 AI 台词） | `actorId`, `showId` | 演员 | - |
| `aiLineChoose` | 标记选用台词 | `lineId` | 演员 | - |
| `aiLineTTS` | 台词 TTS 语音预览（返回音频 fileID） | `text` | 演员 | 语音合成 API |

## 七、AIGC 明信片

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `postcardSceneList` | 场景模板列表 | - | 登录 | - |
| `quoteList` | 名言警句库（可按分类） | `category` | 登录 | - |
| `sensitiveCheck` | 手动输入文本敏感词过滤 | `text` | 登录 | 敏感词服务 |
| `postcardGenerate` | 调用文生图生成明信片（<10s，后处理），落库排版参数 | `sceneId`, `quote`, `customText`, `orient`, `arrange`, `font`, `position`, `avatarFileID?` | 登录 | 文生图 API |
| `postcardList` | 我的作品历史 | `page` | 登录 | 云存储 |
| `postcardShare` | 保存高清图至相册/生成分享卡片 | `postcardId` | 登录 | 云存储 |

## 八、周边商城 / 订单

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `productList` | 商品列表 | `page`, `category` | 登录 | - |
| `orderCreate` | 创建兑换订单（积分/混合支付，生成核销码） | `productId`, `quantity`, `payType` | 登录 | - |
| `orderPay` | 微信支付统一下单（预留） | `orderNo` | 登录 | 微信支付 |
| `orderList` | 积分商城兑换订单 | `status`, `page` | 登录 | - |
| `orderRedeem` | 现场核销（校验核销码） | `redemptionCode` | 场务 | - |
| `orderCancel` | 取消/退款 | `orderNo` | 登录/场务 | 微信支付(退款) |

## 九、数据看板（轻量）

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `dashboardDaily` | 当日游客人数/积分发放/热门卡片/兑换Top | `date` | 场务 | 聚合查询 |
| `dashboardShow` | 单场次运营明细 | `showId` | 场务 | - |

## 十、实时通信 & 定时任务

| 函数名 | 说明 | 主要入参 | 权限 | 外部依赖 |
|---|---|---|---|---|
| `imUserSig` | 获取腾讯云 IM 用户签名（游客/演员入群鉴权） | - | 登录 | 腾讯云 IM |
| `imCallback` | IM 消息回调（落库弹幕/表情/投票确认） | `callbackBody` | 系统 | - |
| `taskDailyReset` 『定时』 | 每日 0 点重置 `daily_read_pts`，生成 `stat_daily` | - | 系统 | - |
| `taskShowStatus` 『定时』 | 定时扫描并更新场次状态（即将→进行中→已结束） | - | 系统 | - |

---

## 实时通信架构说明
- **通道**：腾讯云 IM 群组（每个 `shows.im_group_id` 对应一个群）。
- **下行（场务→游客）**：`pollStart` / `videoPush` / `segmentStart/End` / `branchLock` / `activityStart` 调用 IM REST 推群消息，游客端监听后渲染投票器、播放短片、切换环节。
- **上行（游客→场务）**：`pollVote` / `emotionSend` 通过云函数写入 DB 并广播，结果页轮询 `pollResult` 或订阅 IM 系统消息刷新柱状图/弹幕。
- **演员台词**：`aiLineGenerate` 调用大模型流式输出，结果经 IM 私信推送到演员端。
- **SLA**：场务指令→游客端 < 1s；投票响应 < 500ms；明信片生成 < 10s。
