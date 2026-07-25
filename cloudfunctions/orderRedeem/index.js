// 云函数：orderRedeem
// 职责：工作人员按核销码核销文创订单（状态置「已核销」）。
// 权限：field / admin。读取集合：users、mall_orders
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return { code, msg } }

async function roleOf(openid) {
  if (!openid) return ''
  const r = await db.collection('users').where({ _openid: openid, role: _.in(['field', 'actor', 'admin']) }).limit(1).get()
  return (r.data && r.data[0] && r.data[0].role) || ''
}

exports.main = async (event) => {
  const { OPENID } = getOpenid()
  const { code } = event
  try {
    const role = await roleOf(OPENID)
    if (!role || ['field', 'admin'].indexOf(role) === -1) return fail(403, '无权限')
    const res = await db.collection('mall_orders').where({ code }).limit(1).get()
    const order = res.data && res.data[0]
    if (!order) return fail(404, '核销码不存在')
    if (order.status === '已核销') return fail(409, '该订单已核销')
    await db.collection('mall_orders').doc(order._id).update({ data: { status: '已核销', redeemed_at: Date.now() } })
    return ok({ order: Object.assign({}, order, { status: '已核销' }) })
  } catch (e) {
    return fail(500, 'orderRedeem failed: ' + e.message)
  }
}
