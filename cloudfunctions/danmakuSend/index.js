// 云函数：danmakuSend
// 职责：游客 / 观众把弹幕上行到舞台大屏（游客→大屏上行通道）。
// 任意登录用户均可调用（不限制角色），写入 stage 集合；
// 与工作人员专用的 videoPush（field/admin，source:'staff'）共用 stage 读源，
// 由 getShowRoom / dashboardShow 统一下发，使大屏与工作人员端可见。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return { code, msg } }

const MAX_LEN = 60

exports.main = async (event) => {
  const { OPENID } = getOpenid()
  if (!OPENID) return fail(401, '未登录')
  const { showId, text } = event
  if (!showId) return fail(400, 'missing showId')
  const clean = (text || '').toString().trim()
  if (!clean) return fail(400, '弹幕内容为空')
  if (clean.length > MAX_LEN) return fail(400, '弹幕过长（最多 ' + MAX_LEN + ' 字）')
  try {
    const d = new Date()
    const time = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
    await db.collection('stage').add({
      data: {
        showId,
        text: clean,
        time,
        created_at: d.getTime(),
        openid: OPENID,
        source: 'visitor'
      }
    })
    return ok({ ok: true })
  } catch (e) {
    return fail(500, 'danmakuSend failed: ' + e.message)
  }
}
