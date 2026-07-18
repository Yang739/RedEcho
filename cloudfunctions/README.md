# 云函数说明

每个子目录是一个独立云函数，命名与《云函数接口列表》（见 `docs/RedEcho云函数接口列表.md`）一一对应。
云函数统一返回 `{ code: 0, msg: 'ok', data: {...} }`，`code !== 0` 表示错误。

## 目录结构

```
cloudfunctions/
├── login/              # 游客登录态登记（首次自动建用户档案）—— 已实现
├── getUser/            # 取/建用户档案 —— 已实现
├── getHomeFeed/        # 首页卡片 + 积分 + 今日积分 + 阅读 + 直播演出 —— 已实现
├── getShows/           # 演出列表（按 status 过滤） —— 已实现
├── getShowRoom/        # 场次详情 + 当前投票 + 分支 + 情绪类型 + 通知 —— 已实现
├── pollVote/           # 游客投票（原子自增 + 一人一票校验） —— 已实现
├── submitEmotion/      # 情绪反馈写库 —— 已实现
├── getBranch/          # 分支进度 —— 已实现
├── aiLineGenerate/     # 演员 AI 台词（接腾讯云混元大模型，未配密钥时回退示例） —— 已实现
├── postcardGenerate/   # AIGC 明信片（接腾讯云 AI 绘画文生图，未配密钥时回退 CSS） —— 已实现
├── createOrder/        # 商城下单 —— 已实现
├── getOrders/          # 我的订单 —— 已实现
├── getStatistics/      # 运营数据看板聚合 —— 已实现
├── showReview/         # 演出回顾（场次+我的投票+情绪分布+金句） —— 已实现
├── postcardSceneList/  # 场景模板列表 —— 已实现
├── postcardList/       # 我的明信片历史 —— 已实现
├── getUserProfile/     # 个人中心信息（档案+积分+统计+订单） —— 已实现
└── ...
```

> 公共初始化已**内联到每个云函数顶部**（云开发上传单个函数时只打包该函数目录，无法跨目录引用共享模块）。各云函数统一：
> ```js
> const cloud = require('wx-server-sdk')
> cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
> const db = cloud.database()
> const _ = db.command
> const getOpenid = () => cloud.getWXContext()  // 返回 context 对象，调用方用 const { OPENID } = getOpenid() 解构
> const ok = (data) => ({ code: 0, data })
> const fail = (msg, code = 1) => ({ code, msg })
> ```

## 本地安装依赖（npm）

在「某个云函数目录」下执行（需要 Node.js）：
```bash
cd cloudfunctions/login
npm install
```
注意：`wx-server-sdk` 等依赖必须装在**云函数自己的目录**内，不是项目根目录。
各函数依赖 `wx-server-sdk`，必须装在**云函数自己的目录**内（见下方安装步骤）。

## 部署到云端

在微信开发者工具中：
1. 右键 `cloudfunctions/` 下的函数目录
2. 选择「上传并部署：云端安装依赖」（推荐，云端自动 npm install）
   或「上传并部署：所有文件」（本地已 npm install 时用）
3. 每个云函数目录需**单独**右键上传（云开发不会自动打包同级目录），请逐个部署下方列出的函数。

## 环境 ID

所有云函数统一用 `cloud.DYNAMIC_CURRENT_ENV` 自动适配当前环境，
无需在代码里硬编码 env（每个函数顶部均已 `cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })`）。
项目的环境 ID 请在根目录 `config.js` 中配置，app.js 初始化时注入。

---

## 待实现函数清单

下表为《云函数接口列表》中**本次尚未建目录**的接口，留待后续迭代补齐。
标注「已实现 / 占位」的为本次完成项，供对照。

| 状态 | 函数名 | 一句话职责 |
|---|---|---|
| ✅ 已实现 | login | 游客登录态登记，首次自动建用户 |
| ✅ 已实现 | getUser | 取/建用户档案（积分/等级/角色） |
| ✅ 已实现 | getHomeFeed | 首页卡片+积分+今日积分+阅读+直播演出 |
| ✅ 已实现 | getShows | 演出列表（按 status 过滤） |
| ✅ 已实现 | getShowRoom | 场次详情+当前投票+分支+情绪+通知 |
| ✅ 已实现 | pollVote | 游客投票（原子自增+一人一票） |
| ✅ 已实现 | submitEmotion | 情绪反馈写库 |
| ✅ 已实现 | getBranch | 分支进度查询 |
| 🟢 已接入 | aiLineGenerate | 演员 AI 台词（接腾讯云混元大模型，未配密钥自动回退示例） |
| 🟢 已接入 | postcardGenerate | AIGC 明信片（接腾讯云 AI 绘画文生图，未配密钥自动回退 CSS 渲染） |
| ✅ 已实现 | createOrder | 商城下单（生成核销码） |
| ✅ 已实现 | getOrders | 我的订单 |
| ✅ 已实现 | getStatistics | 运营看板聚合 |
| ⬜ 待补 | authLogin | 微信手机号一键登录（code2Session+手机号） |
| ⬜ 待补 | staffLogin | 工作人员登录（手机号+密码/验证码） |
| ⬜ 待补 | staffVerify | 工作人员双因子二次验证 |
| ✅ 已实现 | getUserProfile | 个人中心信息（档案+积分+统计+订单） |
| ⬜ 待补 | updateUserProfile | 更新昵称/头像/字号偏好 |
| ⬜ 待补 | cardList | 卡片列表（分页/分类/关键词） |
| ⬜ 待补 | cardDetail | 卡片详情 |
| ⬜ 待补 | cardLike | 点赞/取消点赞 |
| ⬜ 待补 | cardFavorite | 收藏/取消收藏 |
| ⬜ 待补 | reportRead | 上报阅读完成发积分（每日上限校验） || ⬜ 待补 | pointsBalance | 积分余额与等级 |
| ⬜ 待补 | pointsHistory | 积分明细（分页） |
| ⬜ 待补 | showDetail | 场次详情+当前环节+演员表 |
| ⬜ 待补 | showJoin | 游客加入演出（加入 IM 群组） |
| ✅ 已实现 | showReview | 演出回顾（场次+我的投票+情绪分布+金句） |
| ⬜ 待补 | showCreate | 场务创建场次 |
| ⬜ 待补 | showUpdate | 场务编辑场次 |
| ⬜ 待补 | showControl | 环节总控（投票/短片/结束） |
| ⬜ 待补 | segmentStart | 开始某环节 |
| ⬜ 待补 | segmentEnd | 结束某环节 |
| ⬜ 待补 | pollUpdate | 实时修改题目/选项 |
| ⬜ 待补 | branchLock | 根据投票锁定剧情分支 |
| ⬜ 待补 | videoPush | 上传并推送历史短片 |
| ⬜ 待补 | activityStart | 发起现场答题抽奖 |
| ⬜ 待补 | activityJudge | 自动判分并发放积分 |
| ⬜ 待补 | showHistory | 历史演出数据 |
| ⬜ 待补 | pollStart | 场务发布投票（推 IM 群） |
| ⬜ 待补 | pollResult | 实时投票结果（柱状图/弹幕） |
| ⬜ 待补 | emotionSend | 发送表情/短语（可上大屏） |
| ⬜ 待补 | emotionStats | 表情统计（大屏用） |
| ⬜ 待补 | videoGet | 游客获取当前推送短片地址 |
| ⬜ 待补 | aiLineList | 台词本（历史 AI 台词） |
| ⬜ 待补 | aiLineChoose | 标记选用台词 |
| ⬜ 待补 | aiLineTTS | 台词 TTS 语音预览 |
| ✅ 已实现 | postcardSceneList | 场景模板列表 |
| ⬜ 待补 | quoteList | 名言警句库 |
| ⬜ 待补 | sensitiveCheck | 手动文本敏感词过滤 |
| ✅ 已实现 | postcardList | 我的明信片历史 |
| ⬜ 待补 | postcardShare | 保存高清图/生成分享卡片 |
| ⬜ 待补 | productList | 商品列表 |
| ⬜ 待补 | orderPay | 微信支付统一下单（预留） |
| ⬜ 待补 | orderRedeem | 现场核销（校验核销码） |
| ⬜ 待补 | orderCancel | 取消/退款 |
| ⬜ 待补 | dashboardDaily | 当日运营明细 |
| ⬜ 待补 | dashboardShow | 单场次运营明细 |
| ⬜ 待补 | imUserSig | 获取腾讯云 IM 用户签名 |
| ⬜ 待补 | imCallback | IM 消息回调落库 |
| ⬜ 待补 | taskDailyReset | 每日 0 点重置与生成统计（定时） |
| ⬜ 待补 | taskShowStatus | 定时扫描更新场次状态（定时） |
