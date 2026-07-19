# RedEcho 小程序前端实现说明

> 技术栈：微信小程序原生（WXML / WXSS / JS）+ 微信云开发
> 设计原则：响应式 `rpx` + 统一设计令牌 + 组件化复用 + 流畅微交互 + 无障碍（减少动效）

## 一、设计系统（`app.wxss`）
- **设计令牌（CSS 变量）**：革命红主色 `#C8161D` + 暖金点缀 `#E8A33D`、中性色板、圆角、阴影、安全区 `env(safe-area-inset-*)`。
- **响应式**：全程 `rpx`（750rpx = 屏宽，天然适配各机型）；安全区适配刘海/底部小黑条。
- **通用工具类**：容器/flex 布局、文字层级、卡片、按钮（`.btn-primary` 等带 `:active` 缩放反馈）、标签/徽标、骨架屏、直播脉冲点。
- **动效（仅 `transform`/`opacity`）**：骨架 shimmer、直播脉冲、卡片 fade-up、进度条/投票条过渡。
- **无障碍**：`@media (prefers-reduced-motion: reduce)` 全局关闭动画；触摸态统一 `scale(.97)` 提供触觉反馈。

## 二、可复用组件（`components/`）
| 组件 | 用途 |
|------|------|
| `re-card` | 通用卡片，支持 `title` / `extra` 插槽 / `tappable` |
| `re-skeleton` | 骨架屏，`rows` / `rowHeight` 可配 |
| `re-tag` | 标签/徽标，`type`（primary/live/accent/...）+ `solid` |

## 三、数据 / 服务层（可无缝切换真实后端）
- `services/mock.js`：本地演示数据集（演出、场景、明信片、订单、用户）。
- `services/resources.js`：首页「资料卡片」精选内容源（湖南主题红色史料，约 22 条、6 分类），由前端直接读取，双模均可展示，无需灌云数据库；每张卡片含 `video` 占位字段（相关内容的简短宣传片，当前仅占位、待填内容）；后续可由运营后台迁移至云端 `cards` 集合。
- `services/api.js`：业务接口封装，当前以 `setTimeout` 模拟云函数返回；**接入真实后端时仅需把 `delay(...)` 替换为 `wx.cloud.callFunction`**，页面层零改动。
- `store.js`：轻量全局状态（用户/积分），`subscribe` 发布订阅，页面 `onUnload` 自动退订，避免泄漏。

## 四、页面与交互
| 页面 | 关键交互 |
|------|----------|
| 首页 `pages/home` | Hero 积分卡、推荐卡（**从全库随机抽取 3 张**湖南主题史料，优先未读）、直播入口；**骨架屏 + 下拉刷新**；「更多 ›」跳资料中心；红色足迹（本地阅读历史最近 3 篇，与我的阅读同源，全部跳 `pages/read/read`） |
| 演出 `pages/show` | 分段筛选（全部/直播中/即将开始/已结束）+ 卡片列表（直播脉冲徽标） |
| 演出房间 `packages/show/pages/room` | **实时投票**（选票后结果条动画 + 定时轮询模拟实时）、情绪反馈、剧情分支、现场通知、弹幕输入 |
| 创作 `pages/create` | 场景网格 + 我的作品横向画廊 |
| 明信片生成 `packages/create/pages/generate` | 场景选择 → 生成遮罩 → **离屏 Canvas 绘制造明信片 → 保存相册**（含权限引导） |
| 我的 `pages/mine` | 个人资料、积分、数据统计（收藏数读本地收藏实时刷新）、服务菜单（含"我的阅读"与"阅读收藏"入口，订阅 store 实时刷新积分） |
| 我的阅读 `pages/read/read` | 本地阅读历史列表：按倒序展示已读篇章，**每篇标注阅读时间（20XX 年 X 月 XX 日  XX : XX，24 小时制，灰色）**，点击回看详情，可清空（见 `services/readHistory.js`） |
| 阅读收藏 `pages/favorites/favorites` | 本地收藏列表：展示全部收藏篇章，点击回看详情，可单条取消或清空（见 `services/favorites.js`） |
| 资料中心 `pages/resource/list` | 顶部分类筛选栏（全部 / 历史事件 / 湘籍伟人 / 红色旧址 / 湖湘精神 / 英烈丰碑），展示该分类全部资料 |
| 资料详情 `pages/resource/detail` | 按 id 查卡片，渲染导语 / 正文 / 关键要点 / 名言；含「相关宣传片」占位区块（短视频，待填内容）；底部「收藏」按钮切换本地收藏状态；导航栏标题随卡片 |
| 演出回顾 `packages/show/pages/review` | 我的投票、情绪分布条形图、金句、引导生成明信片 |

## 五、如何运行
1. 微信开发者工具导入 `RedEcho/` 目录，**AppID 填你自己的**（云开发不支持游客测试号）。
2. 开通云开发（按量付费），把 `config.js` 的 `ENV` 改为控制台环境 ID。
3. 右键 `cloudfunctions/login` → 上传并部署（云端安装依赖）。
4. 编译即可预览全部界面（当前为本地 mock 数据，无需后端即可跑通交互）。

## 六、下一步建议
- 将 `services/api.js` 的 mock 替换为真实云函数（`getHomeData` / `getShows` / `submitVote` / `generatePostcard` 等已在《云函数接口列表》定义）。
- 演出房间实时通道可升级为腾讯云 IM 群组推送（见《架构设计》），替换当前 `setInterval` 轮询。
- 补充单元/组件测试与真机多机型回归（重点验证安全区与 Canvas 导出）。
