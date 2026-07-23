// pages/profile/profile.js —— 头像编辑（仅修改头像，昵称等信息在「个人资料」页）
const store = require('../../store.js')

// 预设形象：emoji + 渐变底色
const PRESETS = [
  { emoji: '🎯', gradient: 'linear-gradient(135deg,#C8161D,#7A0A10)' },
  { emoji: '🌟', gradient: 'linear-gradient(135deg,#E6A23C,#C8161D)' },
  { emoji: '🚩', gradient: 'linear-gradient(135deg,#b3000b,#7A0A10)' },
  { emoji: '⚡', gradient: 'linear-gradient(135deg,#F56C6C,#C8161D)' },
  { emoji: '📜', gradient: 'linear-gradient(135deg,#9E6A3D,#5C3A1E)' },
  { emoji: '🏮', gradient: 'linear-gradient(135deg,#E63946,#9A031E)' },
  { emoji: '🕯️', gradient: 'linear-gradient(135deg,#C77DFF,#7B2CBF)' },
  { emoji: '🛤️', gradient: 'linear-gradient(135deg,#4E7CC9,#2A4D8E)' }
]

Page({
  data: {
    avatarText: '红',
    avatar: '',          // 上传图片的持久化路径（saveFileSync）
    avatarEmoji: '🎯',
    avatarGradient: 'linear-gradient(135deg,#C8161D,#7A0A10)',
    avatarMode: 'emoji', // emoji | image
    presets: PRESETS
  },

  onLoad() {
    const p = store.getState().profile || {}
    this.setData({
      // 头像页不改昵称，故 avatarText 沿用当前昵称首字（避免回退成默认值）
      avatarText: p.avatarText || (p.nickname || '红色旅人').charAt(0) || '红',
      avatar: p.avatar || '',
      avatarEmoji: p.avatarEmoji || '🎯',
      avatarGradient: p.avatarGradient || 'linear-gradient(135deg,#C8161D,#7A0A10)',
      avatarMode: p.avatar ? 'image' : 'emoji'
    })
  },

  onSelectPreset(e) {
    const i = e.currentTarget.dataset.idx
    const item = this.data.presets[i]
    this.setData({ avatarEmoji: item.emoji, avatarGradient: item.gradient, avatar: '', avatarMode: 'emoji' })
  },

  // 从相册 / 相机选择头像，并 saveFileSync 持久化到用户目录（重启后仍可用）
  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tmp = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath
        if (!tmp) return
        let saved = tmp
        try {
          saved = wx.getFileSystemManager().saveFileSync(tmp)
        } catch (err) {
          saved = tmp
        }
        this.setData({ avatar: saved, avatarMode: 'image' })
      }
    })
  },

  onSave() {
    // 仅保存头像相关字段（setProfile 合并，不覆盖昵称等其它资料）
    store.setProfile({
      avatarText: this.data.avatarText,
      avatar: this.data.avatar,
      avatarEmoji: this.data.avatarEmoji,
      avatarGradient: this.data.avatarGradient
    })
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => { wx.navigateBack() }, 600)
  }
})
