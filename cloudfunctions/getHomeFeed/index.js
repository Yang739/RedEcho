// 云函数：getHomeFeed
// 职责：返回首页卡片列表 + 用户积分 + 今日获得积分 + 阅读进度 + 演出进行中的场次。
// 读取集合：cards / users / points_logs / shows（集合名全项目统一小写驼峰）。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1, extra) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return extra ? { code, msg, ...extra } : { code, msg } }

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

exports.main = async (event, context) => {
  const { OPENID } = getOpenid()
  if (!OPENID) return fail(401, 'missing openid')

  try {
    // 用户积分
    const uRes = await db.collection('users').where({ openid: OPENID }).get()
    const points = uRes.data[0] ? (uRes.data[0].points || 0) : 0

    // 今日获得积分（points_logs 中 created_at 当天且 delta>0）
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const pRes = await db
      .collection('points_logs')
      .where({ openid: OPENID, delta: _.gt(0), created_at: _.gte(start) })
      .get()
    const todayGain = pRes.data.reduce((s, r) => s + (r.delta || 0), 0)

    // 推荐卡片（取前 3 篇，按 sort 升序）
    const cRes = await db
      .collection('cards')
      .orderBy('sort', 'asc')
      .limit(3)
      .get()

    // 阅读进度（reading 集合；未建则返回空）
    let reading = []
    try {
      const rRes = await db
        .collection('reading')
        .where({ openid: OPENID })
        .orderBy('progress', 'desc')
        .limit(5)
        .get()
      reading = rRes.data
    } catch (e) {
      reading = []
    }

    // 演出进行中的场次（取第一个 live）
    const sRes = await db
      .collection('shows')
      .where({ status: 'live' })
      .limit(1)
      .get()
    const liveShow = sRes.data[0] || null

    return ok({
      greeting: greeting(),
      points,
      todayGain,
      recommend: cRes.data,
      reading,
      liveShow
    })
  } catch (e) {
    return fail(500, 'getHomeFeed failed: ' + e.message)
  }
}
