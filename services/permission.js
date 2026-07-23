// services/permission.js —— 工作人员权限集中策略
//
// 三档身份：场务(field) / 演员(actor) / 管理员(admin)
// 权限矩阵 POLICY：每个 action 列出允许的角色；页面统一通过 staffCan(action) 判断，
// WXML 用 wx:if 控制可见性，JS 用 if 兜底拦截，避免越权操作。
// 游客 isStaff=false 时 staffCan 一律返回 false，看不到任何工作人员 UI。

const store = require('../store.js')

// 角色常量
const ROLE = {
  FIELD: 'field',   // 场务
  ACTOR: 'actor',   // 演员
  ADMIN: 'admin'    // 管理员
}

// 权限矩阵：管控类只给 field/admin；核验/查看给三档；admin 预留人员管理
const POLICY = {
  show_control:  [ROLE.FIELD, ROLE.ADMIN],            // 翻转演出状态（开场/散场）
  poll_manage:   [ROLE.FIELD, ROLE.ADMIN],            // 开关投票 / 改题
  invite_set:    [ROLE.FIELD, ROLE.ADMIN],            // 设置 / 重置邀请码
  invite_verify: [ROLE.FIELD, ROLE.ACTOR, ROLE.ADMIN], // 协助核验邀请码
  notice_push:   [ROLE.FIELD, ROLE.ADMIN],            // 推送现场通知
  order_redeem:  [ROLE.FIELD, ROLE.ADMIN],            // 订单核销
  branch_lock:   [ROLE.FIELD, ROLE.ADMIN],            // 锁定剧情分支
  stage_push:    [ROLE.FIELD, ROLE.ADMIN],            // 弹幕 / 情绪上大屏
  view_data:     [ROLE.FIELD, ROLE.ACTOR, ROLE.ADMIN], // 数据看板（只读）
  admin:         [ROLE.ADMIN]                          // 人员管理（预留，本次不实现）
}

// 当前登录工作人员的角色；未登录返回 ''
function staffRole() {
  const st = store.getState().staff
  return st && st.role
}

// 是否拥有某 action 权限
function staffCan(action) {
  const r = staffRole()
  if (!r) return false
  const allow = POLICY[action]
  return !!allow && allow.indexOf(r) !== -1
}

// 角色中文名
function roleName(role) {
  return { field: '场务', actor: '演员', admin: '管理员' }[role] || role || ''
}

// 批量返回权限布尔，便于一次塞进 data（避免 WXML 里反复调用 staffCan）
function staffCaps(actions) {
  const out = {}
  actions.forEach((a) => { out[a] = staffCan(a) })
  return out
}

module.exports = { ROLE, POLICY, staffCan, staffRole, roleName, staffCaps }
