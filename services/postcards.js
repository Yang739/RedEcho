// services/postcards.js —— 本地「我的作品」明信片存储
// 与 readHistory / favorites 一致：用 wx 本地存储持久化用户创作的明信片，
// 保证「已存入我的作品」提示真实可信，且创作页/我的页/作品列表页同源读取。

const KEY = 'rede_postcards'

function getList() {
  try {
    const v = wx.getStorageSync(KEY)
    return Array.isArray(v) ? v : []
  } catch (e) {
    return []
  }
}

function today() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

// 新增一条作品（置顶），自动补 id / date
function add(rec) {
  const list = getList()
  const item = Object.assign({ id: 'p' + Date.now(), date: today() }, rec)
  list.unshift(item)
  try { wx.setStorageSync(KEY, list) } catch (e) {}
  return list
}

function remove(id) {
  const list = getList().filter((p) => p.id !== id)
  try { wx.setStorageSync(KEY, list) } catch (e) {}
  return list
}

function clear() {
  try { wx.setStorageSync(KEY, []) } catch (e) {}
  return []
}

module.exports = { getList, add, remove, clear, today }
