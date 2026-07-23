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
    const showId = options.id || 's1'
    this.setData({ showId, canLock: perm.staffCan('branch_lock') })
    if (!this.data.canLock) return
    const cfg = (storage.get('rede_show_config', {})[showId]) || {}
    if (cfg.branch) {
      const label = (this.data.branchOptions.find((o) => o.id === cfg.branch) || {}).label || ''
      this.setData({ choice: cfg.branch, locked: cfg.branch, lockedLabel: label })
    }
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
    })
  }
})
