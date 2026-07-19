// pages/read/read.js —— 我的阅读：已读篇章列表（本地阅读历史）
const res = require('../../services/resources.js')
const readHistory = require('../../services/readHistory.js')

const CAT_NAME = res.CATEGORIES.reduce((m, c) => { m[c.key] = c.name; return m }, {})
const READ_SHOW = 50 // 最多展示条数

Page({
  data: { list: [], count: 0 },

  onShow() { this.refresh() },

  refresh() {
    const ids = readHistory.getList()
    const list = ids
      .map((id) => res.cards.find((c) => c.id === id))
      .filter(Boolean)
      .slice(0, READ_SHOW)
      .map((c) => ({
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        catName: CAT_NAME[c.cat] || '',
        gradient: c.gradient
      }))
    this.setData({ list, count: ids.length })
  },

  onRead(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/resource/detail/detail?id=' + id })
  },

  onClear() {
    wx.showModal({
      title: '清空阅读记录',
      content: '确定清空「我的阅读」记录？',
      success: (r) => { if (r.confirm) { readHistory.clear(); this.refresh() } }
    })
  }
})
