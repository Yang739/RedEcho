// 云函数：getUserProfile
// 职责：个人中心信息（档案 + 积分 + 各维度统计 + 积分商城兑换）。
// 读取集合：users / postcards / orders / favorites
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1, extra) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return extra ? { code, msg, ...extra } : { code, msg } }

exports.main = async (event, context) => {
  const { OPENID } = getOpenid()
  if (!OPENID) return fail('missing openid', 401)

  try {
    const uRes = await db.collection('users').where({ openid: OPENID }).get()
    const user = uRes.data[0] || {}

    // 各维度计数（并行）
    const [pc, od, fa] = await Promise.all([
      db.collection('postcards').where({ openid: OPENID }).count(),
      db.collection('orders').where({ openid: OPENID }).count(),
      db.collection('favorites').where({ openid: OPENID }).count()
    ])

    // 积分商城兑换订单列表
    const ordersRes = await db
      .collection('orders')
      .where({ openid: OPENID })
      .orderBy('created_at', 'desc')
      .limit(20)
      .get()

    return ok({
      user: {
        nickname: user.nickname || '红色旅人',
        avatarText: user.avatarText || (user.nickname || '红').slice(0, 1),
        level: user.level || '新兵',
        isStaff: !!user.isStaff
      },
      points: user.points || 0,
      stats: {
        postcards: pc.total,
        orders: od.total,
        favorites: fa.total
      },
      orders: ordersRes.data.map((o) => ({ ...o, id: o._id }))
    })
  } catch (e) {
    return fail('getUserProfile failed: ' + e.message, 500)
  }
}
