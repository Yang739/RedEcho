# packages/create/ 分包（pkgCreate）

明信片 AIGC 创作。

| 页面 | 职责 |
|---|---|
| `generate` | 选场景模板 → 生成明信片：有 `imageUrl` 则展示文生图，否则 Canvas 渐变卡；支持保存相册、再来一张。 |

依赖 `services/api.js` 的 `getScenes` / `generatePostcard` / `getPostcards`。
