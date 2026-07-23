// pages/settings/settings.js —— 设置
const store = require('../../store.js')

// 清除本地数据时需移除的键（覆盖积分、阅读、收藏、明信片、兑换等本地状态；个人资料不在其列）
const LOCAL_KEYS = [
  'rede_points', 'rede_points_init', 'rede_today', 'rede_points_log',
  'rede_awarded_reads', 'rede_awarded_shows', 'rede_postcard_count',
  'rede_mall_orders', 'rede_favorites', 'rede_read_history', 'rede_postcards'
]

Page({
  data: {
    profile: { nickname: '红色旅人', avatarText: '红', avatar: '', avatarEmoji: '🎯', avatarGradient: 'linear-gradient(135deg,#C8161D,#7A0A10)' },
    points: 0,
    isStaff: false,
    staff: null
  },

  unsub: null,

  onLoad() {
    this.unsub = store.subscribe((s) => {
      this.setData({ profile: s.profile, points: s.points, isStaff: s.isStaff, staff: s.staff })
    })
  },

  onUnload() {
    if (this.unsub) this.unsub()
  },

  // 进入头像编辑（仅修改头像）：顶部资料卡「编辑 ›」入口
  onProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' })
  },

  // 进入个人资料（修改昵称 / 签名 / 性别 / 生日 / 手机 / 密码）：账号卡片「个人资料」入口
  onInfo() {
    wx.navigateTo({ url: '/pages/info/info' })
  },

  // 进入操作人员入口（登录 / 切换工作人员模式）
  onStaff() {
    wx.navigateTo({ url: '/pages/staff/staff' })
  },

  onClear() {
    wx.showModal({
      title: '清除本地数据',
      content: '将清除积分、积分明细、阅读历史、收藏、明信片与兑换记录等本地数据（不影响个人资料），确定继续？',
      confirmText: '清除',
      confirmColor: '#C8161D',
      success: (r) => { if (r.confirm) this.doClear() }
    })
  },

  doClear() {
    LOCAL_KEYS.forEach((k) => {
      try { wx.removeStorageSync(k) } catch (e) {}
    })
    store.reset() // 重置内存态（积分/登录态归零）；个人资料保留
    wx.showToast({ title: '已清除本地数据', icon: 'success' })
  },

  // 切换账号：进入操作人员登录页（演示用，可切换为另一操作员）
  onSwitchAccount() {
    wx.navigateTo({ url: '/pages/staff/staff' })
  },

  // 退出登录：退出当前操作人员（场务/演员）身份
  onLogout() {
    if (!this.data.isStaff) {
      wx.showToast({ title: '尚未登录操作人员账号', icon: 'none' })
      return
    }
    wx.showModal({
      title: '退出登录',
      content: '将退出当前操作人员（场务/演员）身份，确定继续？',
      confirmText: '退出',
      confirmColor: '#C8161D',
      success: (r) => {
        if (r.confirm) {
          store.clearStaff()
          wx.showToast({ title: '已退出登录', icon: 'none' })
        }
      }
    })
  }
})
