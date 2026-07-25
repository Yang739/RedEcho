// pages/mine/mine.js
const api = require('../../services/api.js')
const store = require('../../store.js')
const level = require('../../services/level.js')

Page({
  data: {
    user: { nickname: '红色旅人', avatarText: '红', level: '新兵' },
    levelInfo: { lv: 1, name: '新兵', exp: 0, curExp: 0, nextExp: 100, nextName: '宣传员', gap: 100, pct: 0, isMax: false },
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
      const lv = level.calc(s.exp || 0)
      this.setData({
        points: s.points,
        todayGain: s.todayGain,
        levelInfo: lv,
        // 等级以本地经验计算为准（覆盖 API 可能返回的硬编码 level）
        user: { nickname: s.profile.nickname, avatarText: s.profile.avatarText, level: lv.name, isStaff: s.isStaff },
        pf: s.profile
      })
    })
    api.getMine().then((d) => {
      // 仅补充昵称 / 头像 / 工作人员态；等级与积分始终以本地 store 真源为准
      const lv = level.calc(store.getState().exp || 0)
      const u = d.user || {}
      this.setData({
        points: store.getState().points,
        levelInfo: lv,
        user: {
          nickname: u.nickname || '红色旅人',
          avatarText: u.avatarText || '红',
          level: lv.name,
          isStaff: !!u.isStaff
        }
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
