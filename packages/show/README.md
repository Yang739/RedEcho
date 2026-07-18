# packages/show/ 分包（pkgShow）

演出实时互动与回顾。

| 页面 | 职责 |
|---|---|
| `room` | 演出房间：实时投票条、情绪反馈、剧情分支、通知；`setInterval` 模拟实时轮询。 |
| `review` | 演出回顾：情绪分布条、我的投票、金句展示。 |

依赖 `services/api.js` 的 `getShowRoom` / `submitVote` / `submitEmotion` / `pollResult` / `getReview`。
