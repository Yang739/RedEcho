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
  const r = await db.collection('users').where({ _openid: openid, role: _.in(['field', 'actor', 'admin']) }).limit(1).get()
  return (r.data && r.data[0] && r.data[0].role) || ''
}

exports.main = async (event) => {
  const { OPENID } = getOpenid()
  const { showId, status } = event
  try {
    const role = await roleOf(OPENID)
    if (!role || ['field', 'admin'].indexOf(role) === -1) return fail(403, '无权限')
    // 兼容种子场次（带自定义 id）与新建场次（仅 _id）：先按 id 或 _id 定位真实 _id 再更新
    const sRes = await db.collection('shows').where(_.or([{ id: showId }, { _id: showId }])).limit(1).get()
    const realId = sRes.data && sRes.data[0] && sRes.data[0]._id
    if (!realId) return fail(404, '场次不存在')
    await db.collection('shows').doc(realId).update({ data: { status } })
    return ok({ showId, status })
  } catch (e) {
    return fail(500, 'showControl failed: ' + e.message)
  }
}
