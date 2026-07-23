// 云函数：noticePush
// 职责：工作人员推送现场通知（场务提示）。按场次写入 notices 集合。
// 权限：field / admin。读取集合：users、notices
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return { code, msg } }

async function roleOf(openid) {
  if (!openid) return ''
  const r = await db.collection('users').where({ _openid: openid }).limit(1).get()
  return (r.data && r.data[0] && r.data[0].role) || ''
}

exports.main = async (event) => {
  const { OPENID } = getOpenid()
  const { showId, text } = event
  try {
    const role = await roleOf(OPENID)
    if (!role || ['field', 'admin'].indexOf(role) === -1) return fail(403, '无权限')
    const d = new Date()
    const time = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
    await db.collection('notices').add({ data: { showId, text, time, created_at: d.getTime() } })
    return ok({ ok: true })
  } catch (e) {
    return fail(500, 'noticePush failed: ' + e.message)
  }
}
