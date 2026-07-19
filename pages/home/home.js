// pages/home/home.js
const api = require('../../services/api.js')
const store = require('../../store.js')
const res = require('../../services/resources.js')
const readHistory = require('../../services/readHistory.js')

const HOME_MAX = 3 // 首页随机推荐 3 条（从整个资料库随机挑选）
const CAT_NAME = res.CATEGORIES.reduce((m, c) => { m[c.key] = c.name; return m }, {})
const READ_SHOW = 3 // 红色足迹仅展示最近 3 篇

Page({
  data: {
    loading: true,
    home: { greeting: '你好', points: 0, todayGain: 0, recommend: [], reading: [], liveShow: null },
    nickname: '旅人',
    avatarText: '红',
    hasMore: false
  },

  unsub: null,

  onLoad() {
    this.unsub = store.subscribe((s) => {
      if (s.user) this.setData({ nickname: s.user.nickname, avatarText: s.user.avatarText })
    })
    this.load()
  },

  onShow() {
    // 回到首页时刷新阅读记录与推荐，反映最新已读状态
    this.buildReading()
    this.buildRecommend()
  },

  onUnload() {
    if (this.unsub) this.unsub()
  },

  // 从整个资料库随机抽取 n 条（Fisher–Yates 洗牌）
  pickRandom(list, n) {
    const arr = list.slice()
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t
    }
    return arr.slice(0, n)
  },

  // 为你推荐：优先推送未读文章；未读不足 HOME_MAX 时以已读补足；全部读完则继续随机
  buildRecommend() {
    const readIds = new Set(readHistory.getList())
    const unread = res.cards.filter((c) => !readIds.has(c.id))
    const read = res.cards.filter((c) => readIds.has(c.id))
    let pool = this.pickRandom(unread, HOME_MAX)
    if (pool.length < HOME_MAX) {
      pool = pool.concat(this.pickRandom(read, HOME_MAX - pool.length))
    }
    const recommend = pool.map((c) => Object.assign({}, c, { read: readIds.has(c.id) }))
    this.setData({ 'home.recommend': recommend, hasMore: res.cards.length > HOME_MAX })
  },

  // 红色足迹：从本地阅读历史读取，仅展示最近 3 篇；与「我的」页共用 readHistory 数据源
  buildReading() {
    const ids = readHistory.getList()
    const list = ids
      .map((id) => res.cards.find((c) => c.id === id))
      .filter(Boolean)
      .slice(0, READ_SHOW)
      .map((c) => ({ id: c.id, title: c.title, catName: CAT_NAME[c.cat] || '', gradient: c.gradient }))
    this.setData({ 'home.reading': list })
  },

  load() {
    this.setData({ loading: true })
    api.getHomeData()
      .then((d) => {
        this.setData({
          home: Object.assign({}, this.data.home, {
            greeting: d.greeting,
            points: d.points,
            todayGain: d.todayGain,
            liveShow: d.liveShow
          }),
          loading: false
        })
        this.buildReading()
        this.buildRecommend()
        wx.stopPullDownRefresh()
      })
      .catch(() => {
        // 云端异常时仍保证资料卡片可见
        this.setData({ loading: false })
        this.buildReading()
        this.buildRecommend()
        wx.stopPullDownRefresh()
      })
  },

  onPullDownRefresh() {
    this.load()
  },

  // 进入「更多」资料列表页（列表页内再提供分类筛选）
  onMore() {
    wx.navigateTo({ url: '/pages/resource/list/list' })
  },

  // 红色足迹「全部」按钮：跳转我的阅读列表页
  onAllReads() {
    wx.navigateTo({ url: '/pages/read/read' })
  },

  // 点击卡片：进入资料详情页
  onRead(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/resource/detail/detail?id=${id}` })
  },

  goRoom(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/packages/show/pages/room/room?id=${id}` })
  },

  goPoints() {
    wx.switchTab({ url: '/pages/mine/mine' })
  }
})
