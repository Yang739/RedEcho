// pages/resource/detail/detail.js
const res = require('../../../services/resources.js')
const readHistory = require('../../../services/readHistory.js')
const favorites = require('../../../services/favorites.js')

Page({
  data: { card: null, favorited: false },

  onLoad(query) {
    const id = query && query.id
    const card = res.cards.find((c) => c.id === id)
    if (card) {
      wx.setNavigationBarTitle({ title: card.title })
      readHistory.add(id) // 记录阅读历史（"我的阅读"模块）
      this.setData({ card, favorited: favorites.has(id) })
    } else {
      wx.setNavigationBarTitle({ title: '资料详情' })
    }
  },

  // 切换收藏状态
  onToggleFav() {
    const id = this.data.card && this.data.card.id
    if (!id) return
    const favorited = favorites.toggle(id)
    this.setData({ favorited })
    wx.showToast({ title: favorited ? '已收藏' : '已取消收藏', icon: 'none' })
  }
})
