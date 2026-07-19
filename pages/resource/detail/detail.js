// pages/resource/detail/detail.js
const res = require('../../../services/resources.js')

Page({
  data: { card: null },

  onLoad(query) {
    const id = query && query.id
    const card = res.cards.find((c) => c.id === id)
    if (card) {
      wx.setNavigationBarTitle({ title: card.title })
      this.setData({ card })
    } else {
      wx.setNavigationBarTitle({ title: '资料详情' })
    }
  }
})
