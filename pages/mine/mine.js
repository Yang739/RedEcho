// pages/mine/mine.js
const api = require('../../services/api.js')
const store = require('../../store.js')
const favorites = require('../../services/favorites.js')

Page({
  data: {
    user: { nickname: '红色旅人', avatarText: '红', level: '长征先锋' },
    points: 0,
    todayGain: 60,
    statsList: [],
    menus: [
      { key: 'create', name: '明信片创作' },
      { key: 'postcards', name: '我的明信片' },
      { key: 'orders', name: '我的订单' },
      { key: 'reads', name: '我的阅读' },
      { key: 'favorites', name: '阅读收藏' },
      { key: 'settings', name: '设置' },
      { key: 'about', name: '关于 红色回响' }
    ]
  },

  unsub: null,

  onLoad() {
    this.unsub = store.subscribe((s) => {
      if (s.user) this.setData({ user: s.user, points: s.points })
      else this.setData({ points: s.points })
    })
    api.getMine().then((d) => {
      const stats = d.stats
      this.setData({
        user: d.user,
        points: d.points,
        statsList: [
          { key: 'postcards', label: '明信片', value: stats.postcards },
          { key: 'orders', label: '订单', value: stats.orders },
          { key: 'favorites', label: '收藏', value: favorites.getList().length }
        ]
      })
    })
  },

  // 回到「我的」时刷新收藏数（从收藏页返回后即时更新）
  onShow() {
    const statsList = this.data.statsList.slice()
    const idx = statsList.findIndex((s) => s.key === 'favorites')
    if (idx !== -1) {
      statsList[idx] = Object.assign({}, statsList[idx], { value: favorites.getList().length })
      this.setData({ statsList })
    }
  },

  onUnload() {
    if (this.unsub) this.unsub()
  },

  onPoints() {
    wx.showToast({ title: '积分明细开发中', icon: 'none' })
  },

  onStat(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'postcards') wx.switchTab({ url: '/pages/create/create' })
    else wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  onMenu(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'postcards') wx.switchTab({ url: '/pages/create/create' })
    else if (key === 'create') wx.navigateTo({ url: '/packages/create/pages/generate/generate' })
    else if (key === 'reads') wx.navigateTo({ url: '/pages/read/read' })
    else if (key === 'favorites') wx.navigateTo({ url: '/pages/favorites/favorites' })
    else wx.showToast({ title: '功能开发中', icon: 'none' })
  }
})
