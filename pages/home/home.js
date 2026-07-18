// pages/home/home.js
const api = require('../../services/api.js')
const store = require('../../store.js')
const mock = require('../../services/mock.js')

Page({
  data: {
    loading: true,
    home: { greeting: '你好', points: 0, todayGain: 0, recommend: [], reading: [], liveShow: null },
    nickname: '旅人',
    avatarText: '红',
    footerText: '下拉刷新 · 上拉加载更多'
  },

  unsub: null,
  pool: [],

  onLoad() {
    this.unsub = store.subscribe((s) => {
      if (s.user) this.setData({ nickname: s.user.nickname, avatarText: s.user.avatarText })
    })
    // 推荐位已取前 3 篇，剩余放入加载池用于上拉加载
    this.pool = mock.cards.slice(3)
    this.load(true)
  },

  onUnload() {
    if (this.unsub) this.unsub()
  },

  load(refresh) {
    this.setData({ loading: true })
    api.getHomeData()
      .then((res) => {
        const recommend = refresh ? res.recommend : this.data.home.recommend.concat(res.recommend)
        this.setData({ loading: false, home: Object.assign({}, res, { recommend }) })
        wx.stopPullDownRefresh()
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.stopPullDownRefresh()
      })
  },

  onPullDownRefresh() {
    this.load(true)
  },

  onReachBottom() {
    if (this.data.loading) return
    const more = this.pool.splice(0, 2)
    if (!more.length) {
      this.setData({ footerText: '— 已经到底啦 —' })
      return
    }
    const recommend = this.data.home.recommend.concat(more)
    this.setData({ 'home.recommend': recommend })
  },

  onRead() {
    wx.showToast({ title: '开始阅读 +5 积分', icon: 'none' })
    store.addPoints(5)
  },

  goRoom(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/packages/show/pages/room/room?id=${id}` })
  },

  goPoints() {
    wx.switchTab({ url: '/pages/mine/mine' })
  }
})
