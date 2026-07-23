// 云函数：staffLogin
// 职责：校验工作人员手机号+密码，返回 { role, roleName, name }。
// 读取集合：users（role ∈ field/actor/admin）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return { code, msg } }

exports.main = async (event) => {
  const { phone, pwd } = event
  try {
    const res = await db.collection('users')
      .where({ phone, password: pwd, role: _.in(['field', 'actor', 'admin']) })
      .limit(1).get()
    const u = res.data && res.data[0]
    if (!u) return fail(401, '账号或密码错误')
    const roleName = { field: '场务', actor: '演员', admin: '管理员' }[u.role] || u.role
    return ok({ name: u.name || u.nickname || '工作人员', role: u.role, roleName })
  } catch (e) {
    return fail(500, 'staffLogin failed: ' + e.message)
  }
}
