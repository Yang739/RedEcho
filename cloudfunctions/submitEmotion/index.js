// 云函数：submitEmotion
// 职责：写入情绪反馈 emotion_feedbacks（可上大屏）。
// 写入集合：emotion_feedbacks
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1, extra) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return extra ? { code, msg, ...extra } : { code, msg } }

exports.main = async (event, context) => {
  const { OPENID } = getOpenid()
  const { showId, type } = event
  if (!OPENID) return fail(401, 'missing openid')
  if (!showId || !type) return fail(400, 'missing showId or type')

  try {
    await db.collection('emotion_feedbacks').add({
      data: {
        openid: OPENID,
        showId,
        type,
        created_at: new Date()
      }
    })
    return ok({ ok: true, type })
  } catch (e) {
    return fail(500, 'submitEmotion failed: ' + e.message)
  }
}
