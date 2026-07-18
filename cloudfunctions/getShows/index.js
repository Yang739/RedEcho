// 云函数：getShows
// 职责：返回演出列表，可按 status 过滤（upcoming / live / ended / all）。
// 读取集合：shows
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1, extra) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return extra ? { code, msg, ...extra } : { code, msg } }

exports.main = async (event, context) => {
  const status = (event.status || 'all')
  try {
    let query = db.collection('shows').orderBy('date', 'asc')
    if (status && status !== 'all') {
      query = query.where({ status })
    }
    const res = await query.get()
    return ok(res.data)
  } catch (e) {
    return fail(500, 'getShows failed: ' + e.message)
  }
}
