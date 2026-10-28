// pages/show/show.js
const api = require('../../services/api.js')

Page({
  data: {
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'live', label: '演出中' },
      { key: 'upcoming', label: '即将开始' },
      { key: 'ended', label: '已结束' }
    ],
    filter: 'all',
    list: [],
    loading: true,
    statusText: { live: '演出中', upcoming: '即将开始', ended: '已结束' },
    ctaText: { live: '进入演出现场 ›', upcoming: '查看预告 ›', ended: '查看回顾 ›' }
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
      .catch((err) => {
        // 诊断用：把真实错误暴露出来，避免静默空白
        console.error('[getShows] 加载失败:', err)
        wx.showToast({ title: '演出加载失败: ' + ((err && err.message) || '未知错误').slice(0, 28), icon: 'none' })
        this.setData({ loading: false })
      })
  },

  onFilter(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.filter) return
    this.setData({ filter: key })
    this.load()
  },

  // 按状态分流：已结束 → 演出回顾页；演出中 / 即将开始 → 演出房间页
  goContent(e) {
    const { id, status } = e.currentTarget.dataset
    const url = status === 'ended'
      ? `/packages/show/pages/review/review?id=${id}`
      : `/packages/show/pages/room/room?id=${id}`
    wx.navigateTo({ url })
  }
})
