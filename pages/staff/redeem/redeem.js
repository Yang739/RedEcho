// pages/staff/redeem/redeem.js —— 订单核销（场务 / 管理员）
const api = require('../../../services/api.js')
const perm = require('../../../services/permission.js')

Page({
  data: {
    code: '',
    result: null,     // 核销结果 { ok, order } 或 { ok:false, reason }
    canRedeem: false,
    recent: []        // 最近订单（用于快速点选核销）
  },

  onLoad() {
    this.setData({ canRedeem: perm.staffCan('order_redeem') })
    this.loadRecent()
  },

  loadRecent() {
    api.getMallOrders().then((list) => {
      this.setData({ recent: (list || []).slice(0, 6) })
    })
  },

  onCode(e) { this.setData({ code: e.detail.value, result: null }) },

  onScan() {
    wx.scanCode({
      onlyFromCamera: false,
      success: (r) => {
        this.setData({ code: r.result, result: null })
        this.doRedeem(r.result)
      },
      fail: () => {}
    })
  },

  onRedeem() {
    const code = (this.data.code || '').trim()
    if (!code) {
      wx.showToast({ title: '请输入或扫描核销码', icon: 'none' })
      return
    }
    this.doRedeem(code)
  },

  doRedeem(code) {
    api.redeemOrder(code).then((r) => {
      this.setData({ result: r })
      if (r.ok) {
        wx.showToast({ title: '核销成功', icon: 'success' })
        this.loadRecent()
      } else if (r.reason === 'notfound') {
        wx.showToast({ title: '核销码不存在', icon: 'none' })
      } else if (r.reason === 'redeemed') {
        wx.showToast({ title: '该订单已核销', icon: 'none' })
      }
    }).catch(() => {
      wx.showToast({ title: '核销服务异常', icon: 'none' })
    })
  },

  onPickRecent(e) {
    const code = e.currentTarget.dataset.code
    this.setData({ code, result: null })
    this.doRedeem(code)
  },

  onBack() {
    wx.navigateBack()
  }
})
