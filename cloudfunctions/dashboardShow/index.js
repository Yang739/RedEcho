// 云函数：dashboardShow
// 职责：聚合数据看板（实时票数分布 + 情绪 + 留言流 + 在场人数）。
// 权限：field / actor / admin（只读）。读取集合：shows、polls、emotions、stage
// P1-⑤ 读源修复：实时票数存于 polls 集合 options[].votes（pollVote 原子自增），
// 旧实现误读孤儿集合 pollVotes（无人写入）导致看板票数恒为 0；
// 改为按 showId 查询 open 的 poll，直接取 options[].votes。
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
  const { showId } = event
  try {
    const role = await roleOf(OPENID)
    if (!role || ['field', 'actor', 'admin'].indexOf(role) === -1) return fail(403, '无权限')
    // 兼容种子场次（带自定义 id）与新建场次（仅 _id）
    const showRes = await db.collection('shows').where(_.or([{ id: showId }, { _id: showId }])).limit(1).get()
    const show = (showRes.data && showRes.data[0]) || {}
    // 实时票数：按 showId 查询 open 的 poll（与 pollVote / getShowRoom 同源）。
    let poll = { question: '', options: [] }
    const pRes = await db.collection('polls').where({ showId, open: true }).limit(1).get()
    if (pRes.data && pRes.data[0]) {
      const p = pRes.data[0]
      poll = {
        question: p.question || '',
        options: (p.options || []).map((o) => Object.assign({}, o, { votes: o.votes || 0 }))
      }
    }
    // 情绪 / 留言
    const emotions = await db.collection('emotions').where({ showId }).get()
    const stage = await db.collection('stage').where({ showId }).limit(30).orderBy('created_at', 'desc').get()
    return ok({
      poll,
      emotions: emotions.data || [],
      danmaku: (stage.data || []).map((s) => ({ id: s._id, text: s.text, time: s.time })),
      online: show.online || 0
    })
  } catch (e) {
    return fail(500, 'dashboardShow failed: ' + e.message)
  }
}
