// pages/favorites/favorites.js —— 阅读收藏：已收藏篇章列表（本地收藏）
const res = require('../../services/resources.js')
const favorites = require('../../services/favorites.js')

const CAT_NAME = res.CATEGORIES.reduce((m, c) => { m[c.key] = c.name; return m }, {})
const FAV_SHOW = 200 // 最多展示条数

Page({
  data: { list: [], count: 0 },

  onShow() { this.refresh() },

  refresh() {
    const ids = favorites.getList()
    const list = ids
      .map((id) => res.cards.find((c) => c.id === id))
      .filter(Boolean)
      .slice(0, FAV_SHOW)
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

  // 取消收藏（点「取消」按钮，不触发整行跳转）
  onToggle(e) {
    const id = e.currentTarget.dataset.id
    favorites.toggle(id)
    this.refresh()
  },

  onClear() {
    wx.showModal({
      title: '清空收藏',
      content: '确定清空全部收藏？',
      success: (r) => { if (r.confirm) { favorites.clear(); this.refresh() } }
    })
  }
})
