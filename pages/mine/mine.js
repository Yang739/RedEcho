// pages/mine/mine.js
const api = require('../../services/api.js')
const store = require('../../store.js')
const res = require('../../services/resources.js')
const readHistory = require('../../services/readHistory.js')

const CAT_NAME = res.CATEGORIES.reduce((m, c) => { m[c.key] = c.name; return m }, {})
const READ_SHOW = 8 // 我的阅读最多展示条数

Page({
  data: {
    user: { nickname: '红色旅人', avatarText: '红', level: '长征先锋' },
    points: 0,
    todayGain: 60,
    statsList: [],
    readList: [],   // 我的阅读（最近浏览的资料，倒序）
    readCount: 0,
    menus: [
      { key: 'postcards', name: '我的明信片' },
      { key: 'orders', name: '我的订单' },
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
          { key: 'favorites', label: '收藏', value: stats.favorites }
        ]
      })
    })
  },

  onShow() {
    this.refreshRead()
  },

  onUnload() {
    if (this.unsub) this.unsub()
  },

  // 构建"我的阅读"列表（id -> 卡片摘要）
  refreshRead() {
    const ids = readHistory.getList()
    const list = ids
      .map((id) => res.cards.find((c) => c.id === id))
      .filter(Boolean)
      .slice(0, READ_SHOW)
      .map((c) => ({
        id: c.id,
        title: c.title,
        catName: CAT_NAME[c.cat] || '',
        gradient: c.gradient,
        minutes: c.minutes
      }))
    this.setData({ readList: list, readCount: ids.length })
  },

  onReadTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/resource/detail/detail?id=' + id })
  },

  onClearRead() {
    wx.showModal({
      title: '清空阅读记录',
      content: '确定清空「我的阅读」记录？',
      success: (r) => { if (r.confirm) { readHistory.clear(); this.refreshRead() } }
    })
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
    else wx.showToast({ title: '功能开发中', icon: 'none' })
  }
})
