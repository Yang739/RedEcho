# components/ 复用组件

跨页面复用的原生自定义组件，统一 `styleIsolation: apply-shared`。

| 组件 | 说明 | 关键属性 / 插槽 |
|---|---|---|
| `re-card` | 通用卡片容器 | `title` / `extra`（插槽）/ `tappable` |
| `re-skeleton` | 加载骨架屏占位 | 提供骨架态切换 |
| `re-tag` | 标签 / 徽标 | `type` / `solid` |

所有组件均 `component: true`，页面通过 `usingComponents` 引入。
