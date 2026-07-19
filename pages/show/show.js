// pages/show/show.js
const api = require('../../services/api.js')

Page({
  data: {
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'live', label: '直播中' },
      { key: 'upcoming', label: '即将开始' },
      { key: 'ended', label: '已结束' }
    ],
    filter: 'all',
    list: [],
    loading: true,
    statusText: { live: '直播中', upcoming: '即将开始', ended: '已结束' }
  },

  onLoad() { this.load() },

  onShow() {
    this.load()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  load() {
    this.setData({ loading: true })
    api.getShows(this.data.filter)
      .then((list) => this.setData({ list, loading: false }))
      .catch(() => this.setData({ loading: false }))
  },

  onFilter(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.filter) return
    this.setData({ filter: key })
    this.load()
  },

  goRoom(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/packages/show/pages/room/room?id=${id}` })
  }
})
