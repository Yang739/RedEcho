// services/favorites.js —— 本地阅读收藏（"阅读收藏"模块）
//
// 使用 wx 本地存储记录用户收藏的资料卡 id（倒序），无需后端依赖。
// 游客端未接入账号体系前，收藏仅保存在本机，卸载小程序或清缓存会丢失。

const KEY = 'rede_favorites'
const MAX = 200

function getList() {
  try {
    const v = wx.getStorageSync(KEY)
    return Array.isArray(v) ? v.slice() : []
  } catch (e) {
    return []
  }
}

function has(id) {
  return getList().indexOf(id) !== -1
}

// 切换收藏状态：已收藏则取消，未收藏则加入最前；返回切换后的收藏状态（true=已收藏）
function toggle(id) {
  if (!id) return false
  let list = getList()
  const i = list.indexOf(id)
  if (i !== -1) list.splice(i, 1)
  else {
    list.unshift(id)
    if (list.length > MAX) list = list.slice(0, MAX)
  }
  try { wx.setStorageSync(KEY, list) } catch (e) {}
  return list.indexOf(id) !== -1
}

function remove(id) {
  const list = getList().filter((x) => x !== id)
  try { wx.setStorageSync(KEY, list) } catch (e) {}
  return list
}

function clear() {
  try { wx.setStorageSync(KEY, []) } catch (e) {}
  return []
}

module.exports = { getList, has, toggle, remove, clear }
