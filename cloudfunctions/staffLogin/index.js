// 云函数：staffLogin
// 职责：校验工作人员手机号+密码，返回 { role, roleName, name }。
// 读取集合：users（role ∈ field/actor/admin）
// P1-⑦ 角色链修复：登录成功时把云端 OPENID 回写 users 文档的 _openid 字段，
// 使管控云函数 roleOf(OPENID) 能命中带 role 的文档，打通云模式工作人员管控。
// （种子数据/游客登录均无 _openid，仅此回写可让 staffLogin 用户进入管控链路。）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const getOpenid = () => cloud.getWXContext()
const ok = (data) => ({ code: 0, data })
const fail = (a, b = 1) => { const code = (typeof a === 'number') ? a : b; const msg = (typeof a === 'number') ? b : a; return { code, msg } }

exports.main = async (event) => {
  const { OPENID } = getOpenid()
  const { phone, pwd } = event
  try {
    const res = await db.collection('users')
      .where({ phone, password: pwd, role: _.in(['field', 'actor', 'admin']) })
      .limit(1).get()
    const u = res.data && res.data[0]
    if (!u) return fail(401, '账号或密码错误')
    const roleName = { field: '场务', actor: '演员', admin: '管理员' }[u.role] || u.role
    // 角色链打通：把当前登录的云端 OPENID 绑定到命中的 users 文档。
    // 用 _id 定向更新，避免误改其它文档；云函数默认管理员权限可写任意文档。
    if (OPENID && u._id) {
      await db.collection('users').doc(u._id).update({ data: { _openid: OPENID } }).catch(() => {})
    }
    return ok({ name: u.name || u.nickname || '工作人员', role: u.role, roleName })
  } catch (e) {
    return fail(500, 'staffLogin failed: ' + e.message)
  }
}
