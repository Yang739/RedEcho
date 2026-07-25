// 云函数：createShow
// 职责：工作人员新建演出场次（添加场次）。
// 权限：field / admin（与开场/散场同源，归属「场次管理」）。
// 写入集合：shows（status 默认 upcoming，邀请码自动生成）。
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

// 生成 6 位无歧义邀请码（去掉易混字符）
function genCode() {
  const s = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let c = ''
  for (let i = 0; i < 6; i++) c += s[Math.floor(Math.random() * s.length)]
  return c
}

exports.main = async (event) => {
  const { OPENID } = getOpenid()
  const { title, venue, date, gradient, segment, inviteCode } = event
  try {
    const role = await roleOf(OPENID)
    if (!role || ['field', 'admin'].indexOf(role) === -1) return fail(403, '无权限')
    if (!title || !venue || !date) return fail(400, '标题、地点、时间均必填')
    const doc = {
      title: String(title).trim(),
      venue: String(venue).trim(),
      date: String(date).trim(),
      status: 'upcoming',
      gradient: gradient || 'linear-gradient(135deg,#C8161D 0%,#7A0A10 100%)',
      segment: segment || '未开始',
      pollOpen: false,
      online: 0,
      inviteCode: (inviteCode && String(inviteCode).trim().toUpperCase()) || genCode()
    }
    const res = await db.collection('shows').add({ data: doc })
    return ok({ id: res._id, show: Object.assign({}, doc, { id: res._id }) })
  } catch (e) {
    return fail(500, 'createShow failed: ' + e.message)
  }
}
