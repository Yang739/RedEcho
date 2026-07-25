// 云函数：emotionSend
// 职责：工作人员把情绪反馈推上舞台大屏（舞台总控）。
// 权限：field / admin。读取集合：users、emotions
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
  const { showId, type } = event
  try {
    const role = await roleOf(OPENID)
    if (!role || ['field', 'admin'].indexOf(role) === -1) return fail(403, '无权限')
    await db.collection('emotions').add({ data: { showId, type, created_at: Date.now() } })
    return ok({ ok: true })
  } catch (e) {
    return fail(500, 'emotionSend failed: ' + e.message)
  }
}
