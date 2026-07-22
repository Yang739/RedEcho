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
      // 跨页积分变动后回到首页即时反映
      this.setData({ 'home.points': s.points, 'home.todayGain': s.todayGain })
    })
    this.load()
  },

  onShow() {
    // 红色足迹始终反映最新已读状态
    this.buildReading()
    // 由推荐卡片进入详情并返回时，仅移除刚读的那篇并在尾部补一篇（不整体刷新）
    if (this._pendingReadId) {
      const id = this._pendingReadId
      this._pendingReadId = null
      this.removeAndAppend(id)
    }
    // 同步自定义 tabBar 选中态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
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
    const list = readHistory.getEntries()
      .map((e) => {
        const c = res.cards.find((x) => x.id === e.id)
        if (!c) return null
        return {
          id: c.id,
          title: c.title,
          catName: CAT_NAME[c.cat] || '',
          gradient: c.gradient,
          readTime: readHistory.formatDate(e.time)
        }
      })
      .filter(Boolean)
      .slice(0, READ_SHOW)
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

  // 点击推荐卡片：记录待移除 id，进入详情页（返回时不整体刷新，仅移除该篇并尾部补一篇）
  onRead(e) {
    const id = e.currentTarget.dataset.id
    this._pendingReadId = id
    wx.navigateTo({ url: `/pages/resource/detail/detail?id=${id}` })
  },

  // 由推荐卡片返回时调用：移除刚刚阅读过的那篇，并在列表尾部补充一篇（优先未读）
  removeAndAppend(justReadId) {
    const readIds = new Set(readHistory.getList())
    let list = (this.data.home.recommend || []).slice()
    // 仅移除刚刚阅读过的那篇（其余保持不变，不整体刷新）
    list = list.filter((c) => c.id !== justReadId)
    const existIds = new Set(list.map((c) => c.id))
    // 从「未读且不在当前列表」中补一篇；不足则从已读补
    const unread = res.cards.filter((c) => !readIds.has(c.id) && !existIds.has(c.id))
    const read = res.cards.filter((c) => readIds.has(c.id) && !existIds.has(c.id))
    let pick = this.pickRandom(unread, 1)
    if (pick.length < 1) pick = this.pickRandom(read, 1)
    const appended = pick.map((c) => Object.assign({}, c, { read: readIds.has(c.id) }))
    list = list.concat(appended)
    this.setData({ 'home.recommend': list, hasMore: res.cards.length > list.length })
  },

  goRoom(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/packages/show/pages/room/room?id=${id}` })
  },

  goPoints() {
    wx.navigateTo({ url: '/pages/points/points' })
  }
})
