// 云函数：pollUpdate
// 职责：工作人员开关投票 / 改题 / 改选项（patch = { pollOpen?, question?, options? }）。
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
  const { showId, patch } = event
  try {
    const role = await roleOf(OPENID)
    if (!role || ['field', 'admin'].indexOf(role) === -1) return fail(403, '无权限')
    const data = {}
    if (patch && patch.pollOpen !== undefined) data.pollOpen = !!patch.pollOpen
    if (patch && patch.question !== undefined) data.pollQuestion = patch.question
    if (patch && patch.options !== undefined) data.pollOptions = patch.options
    // 兼容种子场次（带自定义 id）与新建场次（仅 _id）：先定位真实 _id 再更新
    const sRes = await db.collection('shows').where(_.or([{ id: showId }, { _id: showId }])).limit(1).get()
    const realId = sRes.data && sRes.data[0] && sRes.data[0]._id
    if (!realId) return fail(404, '场次不存在')
    await db.collection('shows').doc(realId).update({ data })
    return ok({ showId, patch })
  } catch (e) {
    return fail(500, 'pollUpdate failed: ' + e.message)
  }
}
