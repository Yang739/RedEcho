// pages/settings/settings.js —— 设置（重新规划后的中枢页）
const store = require('../../store.js')

// 清除本地数据需移除的键（覆盖积分、阅读、收藏、明信片、兑换等本地状态）。
// 注意：个人资料(rede_profile)、应用设置(rede_settings)、意见反馈(rede_feedback)
// 均不在此列，清缓存不会重置它们。
const LOCAL_KEYS = [
  'rede_points', 'rede_points_init', 'rede_today', 'rede_points_log',
  'rede_awarded_reads', 'rede_awarded_shows', 'rede_postcard_count',
  'rede_mall_orders', 'rede_favorites', 'rede_read_history', 'rede_postcards'
]

// 客服联系方式（演示）：wx.openCustomerServiceChat 需后台配置，失败则降级为复制
const SERVICE_WECHAT = 'RedEcho2026'

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

  // 个人资料编辑（综合：昵称/签名/性别/生日/手机 + 更换头像入口）
  onProfile() {
    wx.navigateTo({ url: '/pages/info/info' })
  },

  // 个人资料（与顶部资料卡同指 info；info 内含「更换头像」进入头像编辑）
  onInfo() {
    wx.navigateTo({ url: '/pages/info/info' })
  },

  // 修改密码（账号与安全）
  onAccount() {
    wx.navigateTo({ url: '/pages/account/account' })
  },

  // 工作人员模式（场务/演员登录与功能面板）
  // 已登录 → 直接回工作人员主页；未登录 → 进入登录页
  onStaff() {
    if (this.data.isStaff) {
      wx.reLaunch({ url: '/pages/staff/home/home' })
    } else {
      wx.navigateTo({ url: '/pages/staff/staff' })
    }
  },

  // 通知设置
  onNotification() {
    wx.navigateTo({ url: '/pages/notification/notification' })
  },

  // 帮助中心
  onHelp() {
    wx.navigateTo({ url: '/pages/help/help' })
  },

  // 意见反馈
  onFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' })
  },

  // 联系客服
  onContact() {
    if (typeof wx.openCustomerServiceChat === 'function') {
      wx.openCustomerServiceChat({
        extInfo: { url: '' },
        success: () => {},
        fail: () => { this.fallbackContact() }
      })
    } else {
      this.fallbackContact()
    }
  },

  fallbackContact() {
    wx.showModal({
      title: '联系客服',
      content: '客服微信：' + SERVICE_WECHAT + '\n（演示环境，复制后添加）',
      confirmText: '复制',
      success: (r) => {
        if (r.confirm) {
          wx.setClipboardData({ data: SERVICE_WECHAT })
        }
      }
    })
  },

  // 隐私政策
  onPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },

  // 关于
  onAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
  },

  onClear() {
    wx.showModal({
      title: '清除本地数据',
      content: '将清除积分、积分明细、阅读历史、收藏、明信片与兑换记录等本地数据（不影响个人资料、通知设置与反馈），确定继续？',
      confirmText: '清除',
      confirmColor: '#C8161D',
      success: (r) => { if (r.confirm) this.doClear() }
    })
  },

  doClear() {
    LOCAL_KEYS.forEach((k) => {
      try { wx.removeStorageSync(k) } catch (e) {}
    })
    store.reset() // 重置内存态（积分/登录态归零）；个人资料、设置、反馈保留
    wx.showToast({ title: '已清除本地数据', icon: 'success' })
  },

  // 退出工作人员登录（仅工作人员身份）
  onLogout() {
    wx.showModal({
      title: '退出工作人员登录',
      content: '将退出当前工作人员（场务/演员）身份，确定继续？',
      confirmText: '退出',
      confirmColor: '#C8161D',
      success: (r) => {
        if (r.confirm) {
          store.clearStaff()
          wx.reLaunch({ url: '/pages/home/home' })
        }
      }
    })
  }
})
