// pages/settings/settings.js —— 设置
const store = require('../../store.js')

// 清除本地数据时需移除的键（覆盖积分、阅读、收藏、明信片、兑换等本地状态）
const LOCAL_KEYS = [
  'rede_points', 'rede_points_init', 'rede_today', 'rede_points_log',
  'rede_awarded_reads', 'rede_awarded_shows', 'rede_postcard_count',
  'rede_mall_orders', 'rede_favorites', 'rede_read_history', 'rede_postcards'
]

Page({
  data: {
    nickname: '红色旅人',
    avatarText: '红',
    points: 0,
    isStaff: false,
    staff: null,
    version: '1.0.0'
  },

  unsub: null,

  onLoad() {
    this.unsub = store.subscribe((s) => {
      if (s.user) {
        this.setData({ nickname: s.user.nickname || '红色旅人', avatarText: s.user.avatarText || '红' })
      }
      this.setData({ points: s.points, isStaff: s.isStaff, staff: s.staff })
    })
  },

  onUnload() {
    if (this.unsub) this.unsub()
  },

  onPoints() {
    wx.navigateTo({ url: '/pages/points/points' })
  },

  // 进入操作人员入口（登录 / 切换工作人员模式）
  onStaff() {
    wx.navigateTo({ url: '/pages/staff/staff' })
  },

  onClear() {
    wx.showModal({
      title: '清除本地数据',
      content: '将清除积分、积分明细、阅读历史、收藏、明信片与兑换记录等本地数据（不影响账号），确定继续？',
      confirmText: '清除',
      confirmColor: '#C8161D',
      success: (r) => { if (r.confirm) this.doClear() }
    })
  },

  doClear() {
    LOCAL_KEYS.forEach((k) => {
      try { wx.removeStorageSync(k) } catch (e) {}
    })
    store.reset() // 重置内存态（积分/登录态归零）
    wx.showToast({ title: '已清除本地数据', icon: 'success' })
  },

  onAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
  }
})
