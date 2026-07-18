// store.js —— 轻量全局状态（用户 / 积分 / 身份）
// 页面通过 subscribe 订阅，onUnload 时取消订阅，避免内存泄漏。
// 真实环境由云函数 login 写入 userInfo，这里先用本地兜底。

const state = {
  user: null,        // { openid, nickname, avatar, level, isStaff }
  points: 0,         // 当前积分余额
  isStaff: false,    // 是否为工作人员（场务/演员）
  loaded: false
}

const subs = new Set()

function notify() {
  subs.forEach((fn) => {
    try { fn(state) } catch (e) { console.error('[store] listener error', e) }
  })
}

module.exports = {
  getState() { return state },

  setUser(user) {
    Object.assign(state, user)
    state.loaded = true
    notify()
  },

  addPoints(delta) {
    state.points = Math.max(0, state.points + delta)
    notify()
  },

  setPoints(points) {
    state.points = points
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
    notify()
  }
}
