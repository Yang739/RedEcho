// pages/notification/notification.js —— 通知与消息开关
// 开关持久化到 services/settings.js（本地）。无真实推送后端，属演示偏好。
const settings = require('../../services/settings.js')

Page({
  data: {
    showRemind: true,
    interactNotify: true,
    quiet: false
  },

  onLoad() {
    const s = settings.get()
    this.setData({
      showRemind: s.showRemind,
      interactNotify: s.interactNotify,
      quiet: s.quiet
    })
  },

  // 合并补丁并写回，立即刷新开关状态
  apply(patch) {
    const next = settings.set(patch)
    this.setData({
      showRemind: next.showRemind,
      interactNotify: next.interactNotify,
      quiet: next.quiet
    })
  },

  onShowRemind(e) { this.apply({ showRemind: e.detail.value }) },
  onInteract(e) { this.apply({ interactNotify: e.detail.value }) },
  onQuiet(e) { this.apply({ quiet: e.detail.value }) }
})
