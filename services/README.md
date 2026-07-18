# services/ 服务层

前端 BFF 调用层，封装所有后端访问。

| 文件 | 职责 |
|---|---|
| `api.js` | 业务接口封装。依据 `config.js` 的 `ENV` 自动切换：未配置真实环境走 `mock.js` 演示数据；配置后走 `wx.cloud.callFunction` 调用真实云函数。所有方法返回 Promise，统一 resolve 业务数据。 |
| `mock.js` | 本地演示数据（卡片 / 演出 / 投票 / 情绪 / 场景 / 名言 / 订单 / 明信片）。 |

## 双模机制

- `IS_CLOUD = !!(ENV && ENV !== 'your-cloud-env-id')`
- mock 模式用 `setTimeout` 模拟网络延迟；云模式用 `call(name, data)` 统一调用。
- 页面调用方式不变，切换环境无需改业务代码。
