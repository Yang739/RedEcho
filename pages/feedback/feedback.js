// pages/feedback/feedback.js —— 意见反馈
// 提交写入 services/feedback.js（本地 rede_feedback）。演示性质，不联网。
const feedback = require('../../services/feedback.js')

Page({
  data: {
    content: '',
    contact: '',
    submitting: false
  },

  onContent(e) { this.setData({ content: e.detail.value }) },
  onContact(e) { this.setData({ contact: e.detail.value }) },

  onSubmit() {
    const content = (this.data.content || '').trim()
    if (!content) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    feedback.add({ content, contact: (this.data.contact || '').trim() })
    this.setData({ submitting: false, content: '', contact: '' })
    wx.showToast({ title: '已提交，感谢反馈', icon: 'success' })
  }
})
