// 云函数：verifyInvite
// 职责：核验演出现场邀请码。邀请码从服务端 shows 集合读取（不下发客户端，避免泄露）。
// 公开核验（游客与工作人员均可调用）。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return { code, msg } }

exports.main = async (event) => {
  const { showId, code } = event
  try {
    const res = await db.collection('shows').doc(showId).get()
    const expect = res.data && res.data.inviteCode
    const okFlag = !!expect && String(code || '').trim().toUpperCase() === String(expect).trim().toUpperCase()
    return ok({ ok: okFlag })
  } catch (e) {
    return fail(500, 'verifyInvite failed: ' + e.message)
  }
}
