// 云函数：branchLock
// 职责：工作人员锁定剧情分支走向。
// 权限：field / admin。读取集合：users、shows
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
  const { showId, branchId } = event
  try {
    const role = await roleOf(OPENID)
    if (!role || ['field', 'admin'].indexOf(role) === -1) return fail(403, '无权限')
    await db.collection('shows').doc(showId).update({ data: { branch: branchId } })
    return ok({ showId, branchId })
  } catch (e) {
    return fail(500, 'branchLock failed: ' + e.message)
  }
}
