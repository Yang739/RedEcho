// pages/resource/list/list.js —— 资料中心：按分类展示全部资料，点卡片进详情
const res = require('../../../services/resources.js')
const readHistory = require('../../../services/readHistory.js')

Page({
  data: {
    categories: res.CATEGORIES,
    activeCat: 'all',
    list: []
  },

  onLoad(query) {
    const cat = (query && query.cat) || 'all'
    this.setData({ activeCat: cat })
    this.apply()
  },

  apply() {
    const cat = this.data.activeCat
    const readIds = new Set(readHistory.getList())
    const list = (cat === 'all' ? res.cards : res.cards.filter((x) => x.cat === cat))
      .map((c) => Object.assign({}, c, { read: readIds.has(c.id) }))
    this.setData({ list })
  },

  onCat(e) {
    const cat = e.currentTarget.dataset.cat
    if (cat === this.data.activeCat) return
    this.setData({ activeCat: cat }, () => this.apply())
  },

  onRead(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/resource/detail/detail?id=${id}` })
  }
})
