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
    const showId = options.id || 's1'
    this.setData({ showId, canSet: perm.staffCan('invite_set') })
    if (!this.data.canSet) return
    api.getShowRoom(showId).then((d) => {
      this.setData({ inviteCode: d.show.inviteCode || '' })
    })
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
