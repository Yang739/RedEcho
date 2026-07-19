// services/readHistory.js —— 本地阅读历史（"我的阅读"模块）
//
// 使用 wx 本地存储记录已读资料卡 id（倒序、去重、限量），无需后端依赖。
// 游客端未接入账号体系前，阅读记录仅保存在本机，卸载小程序或清缓存会丢失。

const KEY = 'rede_read_history'
const MAX = 50

function getList() {
  try {
    const v = wx.getStorageSync(KEY)
    return Array.isArray(v) ? v : []
  } catch (e) {
    return []
  }
}

// 记录一次阅读：把 id 提到最前、去重、限量
function add(id) {
  if (!id) return getList()
  let list = getList().filter((x) => x !== id)
  list.unshift(id)
  if (list.length > MAX) list = list.slice(0, MAX)
  try { wx.setStorageSync(KEY, list) } catch (e) {}
  return list
}

function clear() {
  try { wx.setStorageSync(KEY, []) } catch (e) {}
  return []
}

module.exports = { getList, add, clear }
