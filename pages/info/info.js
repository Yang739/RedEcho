// pages/info/info.js —— 个人资料（昵称 / 个性签名 / 性别 / 出生日期 / 手机号 / 密码）
// 与「头像编辑」页（pages/profile）分离：本页负责文字类资料，头像编辑负责图像类资料。
const store = require('../../store.js')

const GENDERS = ['保密', '男', '女']

Page({
  data: {
    genders: GENDERS,
    nickname: '',
    signature: '',     // 个性签名
    genderIndex: 0,    // 对应 GENDERS 下标
    gender: '',        // 性别文案
    birthday: '',      // 出生日期 YYYY-MM-DD
    phone: '',         // 手机号
    password: '',      // 密码（输入即覆盖；留空则不修改，避免明文回填输入框）
    today: ''          // 日期选择器上界（今天）
  },

  onLoad() {
    const p = store.getState().profile || {}
    const nickname = p.nickname || '红色旅人'
    let genderIndex = GENDERS.indexOf(p.gender)
    if (genderIndex < 0) genderIndex = 0
    const d = new Date()
    const pad = (n) => (n < 10 ? '0' + n : '' + n)
    this.setData({
      nickname,
      signature: p.signature || '',
      gender: p.gender || '',
      genderIndex,
      birthday: p.birthday || '',
      phone: p.phone || '',
      password: '',
      today: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    })
  },

  onNickname(e) {
    this.setData({ nickname: e.detail.value })
  },

  onSignature(e) {
    this.setData({ signature: e.detail.value })
  },

  onGender(e) {
    const idx = Number(e.detail.value)
    this.setData({ genderIndex: idx, gender: GENDERS[idx] })
  },

  onBirthday(e) {
    this.setData({ birthday: e.detail.value })
  },

  onPhone(e) {
    this.setData({ phone: e.detail.value })
  },

  onPassword(e) {
    this.setData({ password: e.detail.value })
  },

  onSave() {
    const nickname = (this.data.nickname || '').trim()
    if (!nickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' })
      return
    }
    const phone = (this.data.phone || '').trim()
    if (phone && !/^\d{6,20}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }
    // 合并保存：昵称变更同步更新头像文字（首字）；密码仅当本次有输入才覆盖
    const patch = {
      nickname,
      avatarText: nickname.charAt(0),
      signature: this.data.signature || '',
      gender: this.data.gender || '',
      birthday: this.data.birthday || '',
      phone
    }
    if (this.data.password) patch.password = this.data.password
    store.setProfile(patch)
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => { wx.navigateBack() }, 600)
  }
})
