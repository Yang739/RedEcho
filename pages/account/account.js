// pages/account/account.js —— 账号与安全（修改密码）
// 个人资料的文字字段（昵称/签名/性别/生日/手机）在 pages/info 编辑；本页聚焦密码安全。
const store = require('../../store.js')

Page({
  data: {
    phone: '',     // 当前手机号（只读展示，修改去个人资料页）
    pwd: '',       // 新密码
    pwd2: ''       // 确认新密码
  },

  onLoad() {
    const p = store.getState().profile || {}
    this.setData({ phone: p.phone || '' })
  },

  // 修改手机号 → 个人资料页
  onEditPhone() {
    wx.navigateTo({ url: '/pages/info/info' })
  },

  onPwd(e) { this.setData({ pwd: e.detail.value }) },
  onPwd2(e) { this.setData({ pwd2: e.detail.value }) },

  onSave() {
    const pwd = (this.data.pwd || '').trim()
    const pwd2 = (this.data.pwd2 || '').trim()
    if (!pwd) {
      wx.showToast({ title: '请输入新密码', icon: 'none' })
      return
    }
    if (pwd.length < 6) {
      wx.showToast({ title: '密码至少 6 位', icon: 'none' })
      return
    }
    if (pwd !== pwd2) {
      wx.showToast({ title: '两次输入不一致', icon: 'none' })
      return
    }
    // 仅更新密码字段，不覆盖其它资料
    store.setProfile({ password: pwd })
    wx.showToast({ title: '已修改', icon: 'success' })
    setTimeout(() => { wx.navigateBack() }, 600)
  }
})
