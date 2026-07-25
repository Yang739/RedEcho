// pages/staff/branch/branch.js —— 分支总控（锁定剧情走向）
const api = require('../../../services/api.js')
const perm = require('../../../services/permission.js')
const storage = require('../../../services/storage.js')

Page({
  data: {
    showId: '',
    canLock: false,
    branchOptions: [
      { id: 'b1', label: '孤胆突围' },
      { id: 'b2', label: '隐忍潜伏' },
      { id: 'b3', label: '千里求援' }
    ],
    choice: '',     // 选中的分支 id
    locked: '',     // 已锁定的分支 id
    lockedLabel: '' // 已锁定分支的中文名（WXML 不支持方法调用，提前算出）
  },

  onLoad(options) {
    const showId = options.id || ''
    this.setData({ showId, canLock: perm.staffCan('branch_lock') })
    this.reload()
  },

  // 选定正在进行的表演后载入锁定状态
  reload() {
    if (!this.data.canLock || !this.data.showId) return
    const cfg = (storage.get('rede_show_config', {})[this.data.showId]) || {}
    if (cfg.branch) {
      const label = (this.data.branchOptions.find((o) => o.id === cfg.branch) || {}).label || ''
      this.setData({ choice: cfg.branch, locked: cfg.branch, lockedLabel: label })
    } else {
      this.setData({ choice: '', locked: '', lockedLabel: '' })
    }
  },

  // 选择器回调：必须选定一个正在进行的表演才能操作
  onShowChange(e) {
    const show = e.detail
    this.setData({ showId: show ? show.id : '' })
    if (show) this.reload()
    else this.setData({ choice: '', locked: '', lockedLabel: '' })
  },

  onPick(e) {
    this.setData({ choice: e.currentTarget.dataset.id })
  },

  onLock() {
    if (!this.data.canLock) return
    if (!this.data.choice) { wx.showToast({ title: '请选择分支', icon: 'none' }); return }
    api.lockBranch(this.data.showId, this.data.choice).then(() => {
      const label = (this.data.branchOptions.find((o) => o.id === this.data.choice) || {}).label || ''
      this.setData({ locked: this.data.choice, lockedLabel: label })
      wx.showToast({ title: '分支已锁定', icon: 'success' })
    }).catch((err) => {
      wx.showToast({ title: '操作失败：' + (err && err.message ? err.message : '无权限'), icon: 'none' })
    })
  }
})
