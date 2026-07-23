// services/settings.js —— 应用设置（通知 / 消息开关）本地持久化
// 与 profile / points 解耦：仅保存用户的偏好开关，不影响账号与业务数据。
// 说明：当前小程序无真实推送后端，开关仅保存在本设备，用于演示与后续接入订阅消息。

const storage = require('./storage.js')

const KEY = 'rede_settings'
const DEF = {
  showRemind: true,    // 开演提醒
  interactNotify: true, // 互动通知（投票结果 / 表情反馈）
  quiet: false         // 全部静音
}

// 读取设置，缺省值与已存值合并，保证新增开关有默认值
function get() {
  const v = storage.get(KEY, null)
  return (v && typeof v === 'object') ? Object.assign({}, DEF, v) : DEF
}

// 合并补丁并持久化，返回最新完整设置
function set(patch) {
  const next = Object.assign({}, get(), patch || {})
  storage.set(KEY, next)
  return next
}

module.exports = { get, set, DEF }
