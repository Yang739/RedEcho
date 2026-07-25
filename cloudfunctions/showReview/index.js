// 云函数：showReview
// 职责：演出回顾（场次信息 + 我的投票 + 情绪分布 + 一句金句）。
// 读取集合：shows / vote_records / emotion_feedbacks / quotes
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1, extra) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return extra ? { code, msg, ...extra } : { code, msg } }

// 情绪类型（与 getShowRoom / 前端 re-tag 配色一致）
const EMOTIONS = [
  { id: 'e1', label: '感动' },
  { id: 'e2', label: '震撼' },
  { id: 'e3', label: '激昂' },
  { id: 'e4', label: '沉思' }
]
// 无数据时的默认分布（避免前端空白）
const DEFAULT_EMO = [
  { label: '感动', pct: 42 },
  { label: '震撼', pct: 31 },
  { label: '激昂', pct: 19 },
  { label: '沉思', pct: 8 }
]
const DEFAULT_QUOTE = '为有牺牲多壮志，敢教日月换新天。'

exports.main = async (event, context) => {
  const { OPENID } = getOpenid()
  if (!OPENID) return fail('missing openid', 401)

  const showId = event.showId
  if (!showId) return fail('missing showId', 400)

  try {
    // 场次（兼容种子场次自定义 id 与新建场次仅 _id 两种情况）
    const sRes = await db.collection('shows').where(_.or([{ id: showId }, { _id: showId }])).limit(1).get()
    const show = sRes.data[0] || null

    // 我的投票（该用户在该场次的最新一票）
    let myVote = ''
    const vRes = await db
      .collection('vote_records')
      .where({ openid: OPENID, showId })
      .orderBy('created_at', 'desc')
      .limit(1)
      .get()
    if (vRes.data[0]) {
      const v = vRes.data[0]
      myVote = v.optionLabel || v.optionId || ''
    }

    // 情绪分布（按 type 聚合 → 百分比）
    let emotionDist = DEFAULT_EMO
    const agg = await db
      .collection('emotion_feedbacks')
      .aggregate()
      .match({ showId })
      .group({ _id: '$type', count: $.sum(1) })
      .end()
    if (agg.list && agg.list.length) {
      const total = agg.list.reduce((s, x) => s + x.count, 0)
      emotionDist = EMOTIONS.map((e) => {
        const hit = agg.list.find((x) => x._id === e.id)
        const c = hit ? hit.count : 0
        return { label: e.label, pct: total ? Math.round((c / total) * 100) : 0 }
      })
    }

    // 一句金句（随机取一条，兼容字符串/对象存储）
    let quote = DEFAULT_QUOTE
    const qAgg = await db.collection('quotes').aggregate().sample({ size: 1 }).end()
    if (qAgg.list && qAgg.list[0]) {
      const q = qAgg.list[0]
      quote = typeof q === 'string' ? q : (q.text || DEFAULT_QUOTE)
    }

    return ok({ show, myVote, emotionDist, quote })
  } catch (e) {
    return fail('showReview failed: ' + e.message, 500)
  }
}
