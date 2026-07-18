// 云函数：getStatistics
// 职责：运营数据看板聚合（当日游客人数 / 积分发放 / 热门卡片 / 兑换 Top）。
// 读取集合：users / points_logs / orders / cards（聚合）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1, extra) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return extra ? { code, msg, ...extra } : { code, msg } }

exports.main = async (event, context) => {
  try {
    const start = new Date()
    start.setHours(0, 0, 0, 0)

    // 当日新增游客
    const newUsers = await db
      .collection('users')
      .where({ created_at: _.gte(start) })
      .count()

    // 当日发放积分
    const pRes = await db
      .collection('points_logs')
      .where({ delta: _.gt(0), created_at: _.gte(start) })
      .get()
    const pointsIssued = pRes.data.reduce((s, r) => s + (r.delta || 0), 0)

    // 累计订单
    const orders = await db.collection('orders').count()

    // 累计用户
    const users = await db.collection('users').count()

    // 热门卡片 Top5（按浏览/点赞降序，这里用 like 字段近似）
    const cRes = await db
      .collection('cards')
      .orderBy('like', 'desc')
      .limit(5)
      .get()

    return ok({
      date: start.toISOString().slice(0, 10),
      newUsers: newUsers.total,
      pointsIssued,
      totalUsers: users.total,
      totalOrders: orders.total,
      hotCards: cRes.data
    })
  } catch (e) {
    return fail(500, 'getStatistics failed: ' + e.message)
  }
}
