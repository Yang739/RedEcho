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
    // 归一化 id：种子场次带自定义 id（如 "s1"），而经 createShow 新建的场次只存了 _id、
    // 没有自定义 id 字段。两种来源并存会导致下游按 s.id 取 showId 时拿到 undefined。
    // 这里统一把 id 补齐为「自定义 id 优先，否则回退 _id」，使客户端永远拿到可用 id。
    const list = (res.data || []).map((d) => Object.assign({}, d, {
      id: (d.id != null && d.id !== '') ? d.id : d._id
    }))
    return ok(list)
  } catch (e) {
    return fail(500, 'getShows failed: ' + e.message)
  }
}
