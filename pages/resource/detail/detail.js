// pages/resource/detail/detail.js
const res = require('../../../services/resources.js')
const readHistory = require('../../../services/readHistory.js')

Page({
  data: { card: null },

  onLoad(query) {
    const id = query && query.id
    const card = res.cards.find((c) => c.id === id)
    if (card) {
      wx.setNavigationBarTitle({ title: card.title })
      readHistory.add(id) // 记录阅读历史（"我的阅读"模块）
      this.setData({ card })
    } else {
      wx.setNavigationBarTitle({ title: '资料详情' })
    }
  }
})
