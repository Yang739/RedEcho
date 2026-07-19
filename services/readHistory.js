// services/readHistory.js —— 本地阅读历史（"我的阅读"模块）
//
// 使用 wx 本地存储记录已读资料卡（含阅读时间），倒序、去重、限量，无需后端依赖。
// 游客端未接入账号体系前，阅读记录仅保存在本机，卸载小程序或清缓存会丢失。

const KEY = 'rede_read_history'
const MAX = 50

function getRaw() {
  try {
    const v = wx.getStorageSync(KEY)
    return Array.isArray(v) ? v : []
  } catch (e) {
    return []
  }
}

// 兼容旧数据（旧版仅存 id 字符串）：统一为 { id, time }
function normalize(list) {
  return list.map((e) => {
    if (typeof e === 'string') return { id: e, time: Date.now() }
    return { id: e.id, time: e.time || Date.now() }
  })
}

// 已读 id 列表（最新在前），供去重 / 已读状态判断使用
function getList() {
  return normalize(getRaw()).map((e) => e.id)
}

// 已读条目（含阅读时间），供列表展示使用
function getEntries() {
  return normalize(getRaw())
}

// 记录一次阅读：把 id 提到最前、刷新阅读时间、去重、限量
function add(id) {
  if (!id) return getEntries()
  const list = getRaw().filter((e) => (typeof e === 'string' ? e : e.id) !== id)
  list.unshift({ id, time: Date.now() })
  if (list.length > MAX) list = list.slice(0, MAX)
  try { wx.setStorageSync(KEY, list) } catch (e) {}
  return getEntries()
}

function clear() {
  try { wx.setStorageSync(KEY, []) } catch (e) {}
  return []
}

// 阅读时间格式化：2026 年 7 月 19 日  14 : 30（24 小时制）
function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function formatDate(time) {
  const d = new Date(time)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = pad(d.getDate())
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  return y + ' 年 ' + m + ' 月 ' + day + ' 日  ' + hh + ' : ' + mm
}

// 删除单条阅读记录（按 id），返回删除后的条目列表
function remove(id) {
  const list = getRaw().filter((e) => (typeof e === 'string' ? e : e.id) !== id)
  try { wx.setStorageSync(KEY, list) } catch (e) {}
  return getEntries()
}

module.exports = { getList, getEntries, add, remove, clear, formatDate }
