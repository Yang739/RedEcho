// 云函数：getUser
// 职责：根据调用方 OPENID 取/建用户档案，返回前端 store 需要的字段形状。
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

  const res = await db.collection('users').where({ openid: OPENID }).get()
  let user = res.data[0]

  if (!user) {
    // 首次进入：自动建档案
    const now = new Date()
    const addRes = await db.collection('users').add({
      data: {
        openid: OPENID,
        nickname: '红色旅人',
        avatarText: '红',
        level: '新兵',
        isStaff: false,
        points: 0,
        role: 0,
        created_at: now
      }
    })
    user = (await db.collection('users').doc(addRes._id).get()).data
  }

  return ok({
    openid: user.openid,
    nickname: user.nickname || '红色旅人',
    avatarText: user.avatarText || (user.nickname || '红').slice(0, 1),
    level: user.level || '新兵',
    isStaff: !!user.isStaff,
    points: user.points || 0
  })
}
