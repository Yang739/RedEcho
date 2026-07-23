// pages/staff/staff.js —— 操作人员（场务/演员）入口
const store = require('../../store.js')

// 演示用操作人员账号（云函数 staffLogin 未实现前的本地校验）
const DEMO_ACCOUNTS = {
  '13800000000': { name: '场务演示员', role: 'field', roleName: '场务' },
  '13900000000': { name: '演员演示员', role: 'actor', roleName: '演员' }
}
const DEMO_PWD = '123456'

const FUNCS = [
  { key: 'show', name: '场次管理', desc: '创建 / 编辑演出场次' },
  { key: 'poll', name: '投票发布', desc: '发起实时投票与短片推送' },
  { key: 'redeem', name: '订单核销', desc: '现场核销文创兑换码' },
  { key: 'board', name: '数据看板', desc: '游客人数与积分发放统计' }
]

Page({
  data: {
    phone: '',
    password: '',
    error: '',
    isStaff: false,
    staff: null,
    funcs: FUNCS
  },

  unsub: null,

  onLoad() {
    this.unsub = store.subscribe((s) => {
      this.setData({ isStaff: s.isStaff, staff: s.staff })
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
    if (!/^\d{11}$/.test(phone) || !DEMO_ACCOUNTS[phone]) {
      this.setData({ error: '请输入有效的演示手机号（13800000000 / 13900000000）' })
      return
    }
    if (pwd !== DEMO_PWD) {
      this.setData({ error: '密码错误，演示密码为 123456' })
      return
    }
    const info = Object.assign({ phone: phone }, DEMO_ACCOUNTS[phone])
    store.setStaff(info)
    wx.showToast({ title: '已切换操作人员', icon: 'success' })
  },

  onFunc(e) {
    const key = e.currentTarget.dataset.key
    const map = { show: '场次管理', poll: '投票发布', redeem: '订单核销', board: '数据看板' }
    wx.showToast({ title: (map[key] || '功能') + '演示中', icon: 'none' })
  },

  onLogout() {
    store.clearStaff()
    this.setData({ phone: '', password: '', error: '' })
    wx.showToast({ title: '已退出操作人员', icon: 'none' })
  }
})
