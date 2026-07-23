// 云函数：showControl
// 职责：翻转演出状态（upcoming→live 开场 / live→ended 散场）。
// 权限：field / admin。读取集合：users（取角色）、shows（更新状态）
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
  const { showId, status } = event
  try {
    const role = await roleOf(OPENID)
    if (!role || ['field', 'admin'].indexOf(role) === -1) return fail(403, '无权限')
    await db.collection('shows').doc(showId).update({ data: { status } })
    return ok({ showId, status })
  } catch (e) {
    return fail(500, 'showControl failed: ' + e.message)
  }
}
