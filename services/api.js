// services/api.js —— 业务接口封装（前端 BFF 调用层）
//
// 双模支持：
//   - 当 config.js 的 ENV 仍是占位符 'your-cloud-env-id' 时，所有方法走本地 mock
//     （services/mock.js + setTimeout 模拟），页面交互无需后端即可跑通。
//   - 一旦填入真实云环境 ID，所有方法自动切换为 wx.cloud.callFunction 调用真实云函数。
//
// 约定：所有方法返回 Promise，统一 resolve 业务数据；错误在页面层 catch 处理。

const mock = require('./mock.js')
const { ENV } = require('../config.js')

// 是否启用真实云函数：ENV 不是占位符即视为已配置真实环境
const IS_CLOUD = !!(ENV && ENV !== 'your-cloud-env-id')

// 调用云函数的统一封装：成功取 result.data；result.code !== 0 视为业务错误
function call(name, data) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data: data || {},
      success: (res) => {
        const r = res.result || {}
        if (r.code === 0) resolve(r.data)
        else reject(new Error(r.msg || ('cloud function ' + name + ' failed')))
      },
      fail: (err) => reject(err)
    })
  })
}

function delay(data, ms = 420) {
  return new Promise((resolve) => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), ms))
}

// 模拟「实时」数据的小幅波动（用于投票/在线人数等演示）
function jitter(map) {
  return map.map((o) => ({ ...o, votes: o.votes + Math.floor(Math.random() * 6) }))
}

module.exports = {
  /* ---------------- 首页 ---------------- */
  getHomeData() {
    if (IS_CLOUD) return call('getHomeFeed', {})
    return delay({
      greeting: '下午好',
      points: 1280,
      todayGain: 60,
      recommend: mock.cards.slice(0, 3),
      reading: mock.reading,
      liveShow: mock.shows.find((s) => s.status === 'live') || null
    })
  },

  /* ---------------- 演出 ---------------- */
  getShows(filter = 'all') {
    if (IS_CLOUD) return call('getShows', { status: filter })
    const list = filter === 'all' ? mock.shows : mock.shows.filter((s) => s.status === filter)
    return delay(list, 360)
  },

  getShowRoom(showId) {
    if (IS_CLOUD) return call('getShowRoom', { showId })
    const show = mock.shows.find((s) => s.id === showId) || mock.shows[0]
    return delay({
      show,
      poll: mock.poll,
      emotions: mock.emotions,
      branch: mock.branch,
      notices: mock.notices
    })
  },

  // 投票（真实环境：云函数 pollVote 原子自增 + 一人一票校验）
  submitVote(showId, optionId) {
    if (IS_CLOUD) return call('pollVote', { showId, optionId })
    return delay({ ok: true, showId, optionId, ts: Date.now() }, 240)
  },

  submitEmotion(showId, type) {
    if (IS_CLOUD) return call('submitEmotion', { showId, type })
    return delay({ ok: true, type }, 160)
  },

  // 实时轮询投票结果：云模式下复用 getShowRoom 拉取最新票数；mock 模式小幅波动
  pollResult(showId) {
    if (IS_CLOUD) return call('getShowRoom', { showId }).then((d) => d.poll.options)
    return delay(jitter(mock.poll.options), 600)
  },

  // 演出回顾：云函数 showReview（场次 + 我的投票 + 情绪分布 + 金句）
  getReview(showId) {
    if (IS_CLOUD) return call('showReview', { showId })
    return delay({
      show: mock.shows[0],
      myVote: '冒险突围',
      emotionDist: [
        { label: '感动', pct: 42 },
        { label: '震撼', pct: 31 },
        { label: '激昂', pct: 19 },
        { label: '沉思', pct: 8 }
      ],
      quote: mock.quotes[1]
    })
  },

  /* ---------------- 创作 / 明信片 ---------------- */
  // 场景模板：云函数 postcardSceneList
  getScenes() {
    if (IS_CLOUD) return call('postcardSceneList', {})
    return delay(mock.scenes, 320)
  },

  // 生成明信片：云函数 postcardGenerate（文生图接入点已标注为占位）
  generatePostcard(sceneId) {
    if (IS_CLOUD) return call('postcardGenerate', { sceneId })
    const scene = mock.scenes.find((s) => s.id === sceneId) || mock.scenes[0]
    const quote = mock.quotes[Math.floor(Math.random() * mock.quotes.length)]
    return delay({ id: 'p' + Date.now(), scene: scene.name, gradient: scene.gradient, quote, date: '2026-07-18' }, 1600)
  },

  // 我的明信片：云函数 postcardList
  getPostcards() {
    if (IS_CLOUD) return call('postcardList', {})
    return delay(mock.postcards, 300)
  },

  /* ---------------- 我的 ---------------- */
  // 个人中心：云函数 getUserProfile（档案 + 积分 + 统计 + 我的订单）
  getMine() {
    if (IS_CLOUD) return call('getUserProfile', {})
    return delay({
      user: { nickname: '红色旅人', avatarText: '红', level: '长征先锋', isStaff: false },
      points: 1280,
      stats: { postcards: 2, orders: 2, favorites: 12 },
      orders: mock.orders
    })
  },

  getOrders() {
    if (IS_CLOUD) return call('getOrders', {})
    return delay(mock.orders, 300)
  }
}
