// 云函数：staffVerify
// 职责：校验工作人员登录态 token 是否有效（真实环境比对签发 token）。
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return { code, msg } }

exports.main = async (event) => {
  const { OPENID } = getOpenid()
  try {
    if (!OPENID) return fail(401, '未登录')
    // 演示：存在 OPENID 即视为已登录工作人员
    return ok({ ok: true })
  } catch (e) {
    return fail(500, 'staffVerify failed: ' + e.message)
  }
}
