// services/feedback.js —— 用户意见反馈本地存储
// 演示性质：仅保存在本设备（键 rede_feedback），不联网；生产环境应上报云函数。

const storage = require('./storage.js')

const KEY = 'rede_feedback'
const MAX = 50

function list() {
  const v = storage.get(KEY, null)
  return Array.isArray(v) ? v : []
}

// content 必填；contact 选填。返回新建的反馈对象，内容为空返回 null
function add({ content, contact }) {
  const item = {
    id: 'fb' + Date.now() + Math.random().toString(36).slice(2, 6),
    content: (content || '').trim(),
    contact: (contact || '').trim(),
    time: Date.now()
  }
  if (!item.content) return null
  const arr = list()
  arr.unshift(item)
  if (arr.length > MAX) arr.length = MAX
  storage.set(KEY, arr)
  return item
}

module.exports = { list, add }
