# packages/ 分包

为控制主包体积，重交互页放入分包，并在 `app.json` 的 `preloadRule` 中配置进入首页即预载。

| 分包 | root | 页面 | 职责 |
|---|---|---|---|
| pkgShow | `packages/show/` | `room`（演出房间）、`review`（演出回顾） | 实时互动 + 回顾 |
| pkgCreate | `packages/create/` | `generate`（明信片生成） | AIGC 明信片 |

详见 `packages/show/README.md` 与 `packages/create/README.md`。
