// 云函数：postcardList
// 职责：我的明信片历史。
// 读取集合：postcards
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
    const res = await db
      .collection('postcards')
      .where({ openid: OPENID })
      .orderBy('created_at', 'desc')
      .limit(50)
      .get()
    // 云数据库文档主键为 _id；前端列表按 id 渲染，统一映射
    const list = res.data.map((p) => ({ ...p, id: p._id }))
    return ok(list)
  } catch (e) {
    return fail('postcardList failed: ' + e.message, 500)
  }
}
