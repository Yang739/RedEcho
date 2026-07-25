// 云函数：getShowRoom
// 职责：返回某场次详情 + 当前投票题目 + 分支状态 + 情绪类型 + 现场通知。
// 读取集合：shows / polls / branch_log（emotions / notices 暂用默认配置，可由后台集合扩展）。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1, extra) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return extra ? { code, msg, ...extra } : { code, msg } }

// 情绪反馈类型（与前端 re-tag 配色一致；后续可迁入 emotion_types 集合）
const EMOTIONS = [
  { id: 'e1', label: '感动', color: '#E23744' },
  { id: 'e2', label: '震撼', color: '#E8A33D' },
  { id: 'e3', label: '激昂', color: '#C8161D' },
  { id: 'e4', label: '沉思', color: '#6B6661' }
]

// 现场通知（可由 notices 集合接管）
const NOTICES = [
  { id: 'n1', text: '场务提示：第二幕即将切换灯光', time: '19:32' },
  { id: 'n2', text: '演员已就位，请保持安静', time: '19:30' },
  { id: 'n3', text: '投票通道已开启，欢迎参与剧情', time: '19:28' }
]

exports.main = async (event, context) => {
  const showId = event.showId
  if (!showId) return fail(400, 'missing showId')

  try {
    // 兼容种子场次（带自定义 id）与新建场次（仅 _id）：按 id 或 _id 命中
    const sRes = await db.collection('shows').where(_.or([{ id: showId }, { _id: showId }])).limit(1).get()
    const show = sRes.data[0] || null

    // 当前投票题目（该场次下 open 的 poll）
    let poll = { question: '', options: [] }
    const pRes = await db
      .collection('polls')
      .where({ showId, open: true })
      .limit(1)
      .get()
    if (pRes.data[0]) {
      poll = { question: pRes.data[0].question, options: pRes.data[0].options || [] }
    }

    // 分支状态
    let branch = { current: '', locked: false, text: '' }
    const bRes = await db
      .collection('branch_log')
      .where({ showId })
      .orderBy('created_at', 'desc')
      .limit(1)
      .get()
    if (bRes.data[0]) {
      const b = bRes.data[0]
      branch = { current: b.current || '', locked: !!b.locked, text: b.text || '' }
    }

    return ok({
      show,
      poll,
      emotions: EMOTIONS,
      branch,
      notices: NOTICES
    })
  } catch (e) {
    return fail(500, 'getShowRoom failed: ' + e.message)
  }
}
