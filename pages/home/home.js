// pages/home/home.js
const api = require('../../services/api.js')
const store = require('../../store.js')
const res = require('../../services/resources.js')

const HOME_MAX = 3 // 首页随机推荐 3 条（从整个资料库随机挑选）

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

  // 首页只随机展示 HOME_MAX 条，其余进入「更多」
  apply(list) {
    const recommend = this.pickRandom(list, HOME_MAX)
    this.setData({
      loading: false,
      'home.recommend': recommend,
      hasMore: list.length > HOME_MAX
    })
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
            reading: d.reading,
            liveShow: d.liveShow
          })
        })
        this.apply(res.cards)
        wx.stopPullDownRefresh()
      })
      .catch(() => {
        // 云端异常时仍保证资料卡片可见
        this.apply(res.cards)
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
