// pages/mall/mall.js —— 积分商城：文创产品兑换
const api = require('../../services/api.js')
const store = require('../../store.js')

Page({
  data: {
    products: [],
    points: 0,
    orders: []
  },

  unsub: null,

  onLoad() {
    this.unsub = store.subscribe((s) => this.setData({ points: s.points }))
    this.load()
  },

  onShow() {
    // 从其它页积分变动后回到本页即时刷新（订阅已覆盖，这里再拉一次订单）
    this.load()
  },

  onUnload() {
    if (this.unsub) this.unsub()
  },

  load() {
    api.getProducts().then((list) => this.setData({ products: list || [] }))
    api.getMallOrders().then((list) => this.setData({ orders: list || [] }))
  },

  onBuy(e) {
    const id = e.currentTarget.dataset.id
    const p = this.data.products.find((x) => x.id === id)
    if (!p) return
    wx.showModal({
      title: '确认兑换',
      content: '「' + p.title + '」需 ' + p.price + ' 积分，确认兑换？',
      confirmText: '兑换',
      confirmColor: '#C8161D',
      success: (r) => { if (r.confirm) this.doPurchase(p) }
    })
  },

  doPurchase(p) {
    api.purchaseProduct(p.id, 1).then((res) => {
      if (res && res.ok) {
        this.setData({ points: store.getState().points })
        api.getMallOrders().then((list) => this.setData({ orders: list || [] }))
        wx.showToast({ title: '兑换成功', icon: 'success' })
      } else if (res && res.reason === 'points') {
        wx.showToast({ title: '积分不足', icon: 'none' })
      } else {
        wx.showToast({ title: '兑换失败', icon: 'none' })
      }
    }).catch(() => wx.showToast({ title: '兑换失败', icon: 'none' }))
  }
})
