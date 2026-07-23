// pages/staff/staff.js —— 工作人员（场务/演员/管理员）登录页
// 登录成功后 reLaunch 进入工作人员主页 /pages/staff/home/home（与游客端主页对应）。
// 已登录状态从设置页二次进入时，自动跳转回主页。
const store = require('../../store.js')
const api = require('../../services/api.js')

const DEMO_ACCOUNTS = api.DEMO_ACCOUNTS
const DEMO_PWD = api.DEMO_PWD

Page({
  data: {
    phone: '',
    password: '',
    error: '',
    isStaff: false
  },

  unsub: null,

  onLoad() {
    this.unsub = store.subscribe((s) => {
      this.setData({ isStaff: s.isStaff })
      // 已登录：直接回工作人员主页（如从设置二次进入）
      if (s.isStaff) {
        wx.reLaunch({ url: '/pages/staff/home/home' })
      }
    })
  },

  onUnload() {
    if (this.unsub) this.unsub()
  },

  onPhone(e) { this.setData({ phone: e.detail.value, error: '' }) },
  onPwd(e) { this.setData({ password: e.detail.value, error: '' }) },

  onLogin() {
    const phone = (this.data.phone || '').trim()
    const pwd = this.data.password || ''
    if (!/^\d{11}$/.test(phone)) {
      this.setData({ error: '请输入有效的手机号' })
      return
    }
    api.staffLogin(phone, pwd).then((r) => {
      if (!r.ok) {
        this.setData({ error: r.msg || '账号或密码错误' })
        return
      }
      store.setStaff({ phone: phone, name: r.name, role: r.role, roleName: r.roleName })
      wx.reLaunch({ url: '/pages/staff/home/home' })
    }).catch(() => {
      this.setData({ error: '登录服务异常，请稍后重试' })
    })
  },

  onLogout() {
    store.clearStaff()
    this.setData({ phone: '', password: '', error: '' })
    wx.reLaunch({ url: '/pages/home/home' })
  }
})
