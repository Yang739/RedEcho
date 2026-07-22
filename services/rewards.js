// services/rewards.js —— 积分奖励与明信片计费
//
// 规则（与产品需求一致）：
//   1) 阅读一篇文章   +1 积分（同一篇只加一次，按已奖励集合去重）
//   2) 参加一次演出   +5 积分（同一场只加一次）
//   3) 明信片前 5 次生成免费；之后每次生成消耗 1 积分
//      - 免费额度用「累计生成次数」判定，删除作品不会回退已用掉的免费次数
//      - 计费用独立的生成计数器，避免「删了再生成」刷免费额度

const store = require('../store.js')
const storage = require('./storage.js')

const READ_KEY = 'rede_awarded_reads'   // 已奖励积分的文章 id 集合
const SHOW_KEY = 'rede_awarded_shows'   // 已奖励积分的演出 id 集合
const GEN_KEY = 'rede_postcard_count'   // 累计明信片生成次数
const POSTCARD_FREE = 5                 // 前 N 次免费

function getArr(key) {
  const v = storage.get(key, [])
  return Array.isArray(v) ? v : []
}
function pushArr(key, id) {
  const a = getArr(key)
  if (!a.includes(id)) {
    a.push(id)
    storage.set(key, a)
  }
}

// 阅读一篇文章 +1（同篇一次）
function awardRead(id) {
  if (!id) return false
  if (getArr(READ_KEY).includes(id)) return false
  pushArr(READ_KEY, id)
  store.addPoints(1, { type: 'read', title: '阅读文章', ref: id })
  return true
}

// 参加一次演出 +5（同场一次）
function awardShow(showId) {
  if (!showId) return false
  if (getArr(SHOW_KEY).includes(showId)) return false
  pushArr(SHOW_KEY, showId)
  store.addPoints(5, { type: 'show', title: '参与演出', ref: showId })
  return true
}

// 当前明信片计费状态（生成前查询，用于 UI 提示与拦截）
// 返回 { count, free, freeLeft }
function postcardState() {
  const n = getGenCount()
  return {
    count: n,
    free: n < POSTCARD_FREE,
    freeLeft: Math.max(0, POSTCARD_FREE - n)
  }
}

// 生成成功后提交：计数 +1；若已超过免费次数则扣 1 积分
// 返回 { free } —— 本次是否免费
function commitPostcard() {
  const n = getGenCount()
  const free = n < POSTCARD_FREE
  storage.set(GEN_KEY, n + 1)
  if (!free) store.addPoints(-1, { type: 'postcard', title: '生成明信片', ref: 'pc' + Date.now() })
  return { free }
}

function getGenCount() {
  const v = storage.get(GEN_KEY, 0)
  return typeof v === 'number' ? v : 0
}

module.exports = { awardRead, awardShow, postcardState, commitPostcard, POSTCARD_FREE }
