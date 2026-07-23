// 云函数：dashboardShow
// 职责：聚合数据看板（实时票数分布 + 情绪 + 弹幕流 + 在线人数）。
// 权限：field / actor / admin（只读）。读取集合：shows、pollVotes、emotions、stage
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
  const { showId } = event
  try {
    const role = await roleOf(OPENID)
    if (!role || ['field', 'actor', 'admin'].indexOf(role) === -1) return fail(403, '无权限')
    const showRes = await db.collection('shows').doc(showId).get()
    const show = showRes.data || {}
    const poll = show.poll || { question: '', options: [] }
    // 实时票数聚合
    const votes = await db.collection('pollVotes').where({ showId }).get()
    const cnt = {}
    votes.data.forEach((v) => { cnt[v.optionId] = (cnt[v.optionId] || 0) + 1 })
    const options = (poll.options || []).map((o) => Object.assign({}, o, { votes: cnt[o.id] || 0 }))
    // 情绪 / 弹幕
    const emotions = await db.collection('emotions').where({ showId }).get()
    const stage = await db.collection('stage').where({ showId }).limit(30).orderBy('created_at', 'desc').get()
    return ok({
      poll: Object.assign({}, poll, { options }),
      emotions: emotions.data || [],
      danmaku: (stage.data || []).map((s) => ({ id: s._id, text: s.text, time: s.time })),
      online: show.online || 0
    })
  } catch (e) {
    return fail(500, 'dashboardShow failed: ' + e.message)
  }
}
