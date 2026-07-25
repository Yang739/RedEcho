// pages/staff/invite/invite.js —— 邀请码设置 / 重置
const api = require('../../../services/api.js')
const perm = require('../../../services/permission.js')

Page({
  data: {
    showId: '',
    canSet: false,
    inviteCode: '',
    input: ''
  },

  onLoad(options) {
    const showId = options.id || ''
    this.setData({ showId, canSet: perm.staffCan('invite_set') })
    this.reload()
  },

  // 选定正在进行的表演后载入数据
  reload() {
    if (!this.data.canSet || !this.data.showId) return
    api.getShowRoom(this.data.showId).then((d) => {
      this.setData({ inviteCode: d.show.inviteCode || '' })
    })
  },

  // 选择器回调：必须选定一个正在进行的表演才能操作
  onShowChange(e) {
    const show = e.detail
    this.setData({ showId: show ? show.id : '' })
    if (show) this.reload()
    else this.setData({ inviteCode: '' })
  },

  onInput(e) { this.setData({ input: e.detail.value }) },

  onSave() {
    if (!this.data.canSet) return
    const code = (this.data.input || '').trim().toUpperCase()
    if (!code) { wx.showToast({ title: '请输入邀请码', icon: 'none' }); return }
    api.setInvite(this.data.showId, code).then(() => {
      this.setData({ inviteCode: code, input: '' })
      wx.showToast({ title: '邀请码已更新', icon: 'success' })
    }).catch((err) => {
      wx.showToast({ title: '操作失败：' + (err && err.message ? err.message : '无权限'), icon: 'none' })
    })
  }
})
