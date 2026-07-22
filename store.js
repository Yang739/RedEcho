// store.js —— 轻量全局状态（用户 / 积分 / 今日获得 / 身份）
// 页面通过 subscribe 订阅，onUnload 时取消订阅，避免内存泄漏。
// 真实环境由云函数 login 写入 userInfo，这里先用本地兜底。
//
// 积分持久化：points 与 todayGain（今日获得）写入本地存储，跨页面 / 重启保留；
// todayGain 按自然日自动清零，仅统计当日通过奖励获得的积分（消费不计入）。

const storage = require('./services/storage.js')

const POINTS_KEY = 'rede_points'
const TODAY_KEY = 'rede_today'
const POINT_LOG_KEY = 'rede_points_log'  // 积分明细（流水）记录
const POINTS_INIT_KEY = 'rede_points_init' // 迁移标记：旧版曾把种子 1280 写入本地，升级后统一归零
const SEED_POINTS = 0
const LOG_MAX = 100               // 明细最多保留条数

function todayStr() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

// 首次使用（或旧版升级）写入初始积分；旧版曾把种子 1280 写入本地存储，这里统一归零。
function loadPoints() {
  if (storage.get(POINTS_INIT_KEY, null) !== 'v1') {
    storage.set(POINTS_INIT_KEY, 'v1')
    storage.set(POINTS_KEY, SEED_POINTS)
    return SEED_POINTS
  }
  const v = storage.get(POINTS_KEY, null)
  if (typeof v === 'number') return v
  return SEED_POINTS
}

function loadToday() {
  const v = storage.get(TODAY_KEY, null)
  if (v && typeof v === 'object' && v.date === todayStr()) {
    return typeof v.gain === 'number' ? v.gain : 0
  }
  return 0
}

function loadLog() {
  const v = storage.get(POINT_LOG_KEY, [])
  return Array.isArray(v) ? v : []
}

const state = {
  user: null,        // { openid, nickname, avatar, level, isStaff }
  points: loadPoints(),         // 当前积分余额（持久化）
  isStaff: false,    // 是否为工作人员（场务/演员）
  loaded: false,
  todayGain: loadToday(),       // 今日获得的积分（持久化，按日清零）
  todayDate: todayStr(),
  log: loadLog()                // 积分明细流水（持久化，最近 LOG_MAX 条）
}

const subs = new Set()

function notify() {
  subs.forEach((fn) => {
    try { fn(state) } catch (e) { console.error('[store] listener error', e) }
  })
}

// 跨日则重置今日获得
function ensureToday() {
  const t = todayStr()
  if (state.todayDate !== t) {
    state.todayDate = t
    state.todayGain = 0
    storage.set(TODAY_KEY, { date: t, gain: 0 })
  }
}

module.exports = {
  getState() { return state },

  getLog() { return state.log },

  setUser(user) {
    Object.assign(state, user)
    state.loaded = true
    notify()
  },

  // delta 为积分变动量（正=获得，负=消费）；opts 为可选的明细描述：
  //   { type: 'read'|'show'|'postcard'|'redeem'|'adjust', title: '阅读文章', ref: id }
  addPoints(delta, opts) {
    state.points = Math.max(0, state.points + delta)
    // 仅正向奖励累计「今日获得」；消费（负向）不影响今日获得
    if (delta > 0) {
      ensureToday()
      state.todayGain += delta
      storage.set(TODAY_KEY, { date: state.todayDate, gain: state.todayGain })
    }
    storage.set(POINTS_KEY, state.points)
    // 记录积分明细（流水）
    const o = opts || {}
    const entry = {
      id: 'pl' + Date.now() + Math.random().toString(36).slice(2, 6),
      type: o.type || 'adjust',
      title: o.title || (delta > 0 ? '积分奖励' : '积分消费'),
      ref: o.ref || '',
      delta: delta,
      balance: state.points,
      time: Date.now()
    }
    const log = state.log.slice()
    log.unshift(entry)
    if (log.length > LOG_MAX) log.length = LOG_MAX
    state.log = log
    storage.set(POINT_LOG_KEY, log)
    notify()
  },

  setPoints(points) {
    state.points = points
    storage.set(POINTS_KEY, state.points)
    notify()
  },

  subscribe(fn) {
    subs.add(fn)
    // 立即回放一次当前状态
    fn(state)
    return () => subs.delete(fn)
  },

  reset() {
    state.user = null
    state.points = 0
    state.isStaff = false
    state.loaded = false
    storage.set(POINTS_KEY, 0)
    storage.set(TODAY_KEY, { date: todayStr(), gain: 0 })
    notify()
  }
}
