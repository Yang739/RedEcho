// 云函数：getOrders
// 职责：积分商城兑换订单列表（可按 status 过滤）。
// 读取集合：orders
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1, extra) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return extra ? { code, msg, ...extra } : { code, msg } }

exports.main = async (event, context) => {
  const { OPENID } = getOpenid()
  if (!OPENID) return fail(401, 'missing openid')

  const status = event.status
  try {
    let query = db
      .collection('orders')
      .where({ openid: OPENID })
      .orderBy('created_at', 'desc')
    if (status) query = query.where({ status })
    const res = await query.get()
    return ok(res.data)
  } catch (e) {
    return fail(500, 'getOrders failed: ' + e.message)
  }
}
