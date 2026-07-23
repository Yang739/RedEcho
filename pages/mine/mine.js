// pages/mine/mine.js
const api = require('../../services/api.js')
const store = require('../../store.js')

Page({
  data: {
    user: { nickname: '红色旅人', avatarText: '红', level: '长征先锋' },
    pf: { nickname: '红色旅人', avatarText: '红', avatar: '', avatarEmoji: '🎯', avatarGradient: 'linear-gradient(135deg,#C8161D,#7A0A10)' },
    points: 0,
    todayGain: 0,
    menus: [
      { key: 'postcards', name: '我的作品' },
      { key: 'mall', name: '积分商城' },
      { key: 'reads', name: '我的阅读' },
      { key: 'favorites', name: '阅读收藏' },
      { key: 'settings', name: '设置' }
    ]
  },

  unsub: null,

  onLoad() {
    this.unsub = store.subscribe((s) => {
      if (s.user) this.setData({ user: s.user, points: s.points, todayGain: s.todayGain })
      else this.setData({ points: s.points, todayGain: s.todayGain })
      this.setData({ pf: s.profile })
    })
    api.getMine().then((d) => {
      this.setData({
        user: d.user,
        points: d.points
      })
    })
  },

  // 回到「我的」时刷新 tabBar 选中态
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  onUnload() {
    if (this.unsub) this.unsub()
  },

  onPoints() {
    wx.navigateTo({ url: '/pages/points/points' })
  },

  onMenu(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'postcards') wx.navigateTo({ url: '/pages/works/works' })
    else if (key === 'mall') wx.navigateTo({ url: '/pages/mall/mall' })
    else if (key === 'reads') wx.navigateTo({ url: '/pages/read/read' })
    else if (key === 'favorites') wx.navigateTo({ url: '/pages/favorites/favorites' })
    else if (key === 'about') wx.navigateTo({ url: '/pages/about/about' })
    else if (key === 'settings') wx.navigateTo({ url: '/pages/settings/settings' })
    else wx.showToast({ title: '功能开发中', icon: 'none' })
  }
})
