// pages/staff/home/home.js —— 工作人员主页（与游客端 /pages/home/home 对应）
// 登录后进入；结构镜像游客首页：Hero(角色问候) + 当前演出状态卡 + 功能快捷入口 + 现场通知。
const store = require('../../../store.js')
const api = require('../../../services/api.js')
const perm = require('../../../services/permission.js')

// 功能快捷入口：action 决定可见性（staffCan），page 决定去向，needShow 决定是否带 ?id=场次
// 每项均为独立子页面（各功能单独分页，不再共用 room?manage=1）
const FUNC_ITEMS = [
  { key: 'show',   action: 'show_control',  name: '场次管理', desc: '开场 / 散场 / 状态', icon: '🎬', page: '/pages/staff/session/session', needShow: true },
  { key: 'poll',   action: 'poll_manage',   name: '投票发布', desc: '开关投票 / 改题',   icon: '🗳️', page: '/pages/staff/poll/poll',       needShow: true },
  { key: 'notice', action: 'notice_push',   name: '现场通知', desc: '推送场务提示',     icon: '📢', page: '/pages/staff/notice/notice',   needShow: true },
  { key: 'branch', action: 'branch_lock',   name: '分支总控', desc: '锁定剧情走向',     icon: '🌿', page: '/pages/staff/branch/branch',   needShow: true },
  { key: 'stage',  action: 'stage_push',    name: '现场互动', desc: '观众留言 / 情绪汇聚',  icon: '🖥️', page: '/pages/staff/stage/stage',     needShow: true },
  { key: 'redeem', action: 'order_redeem',  name: '订单核销', desc: '扫码核销文创',     icon: '✅', page: '/pages/staff/redeem/redeem',   needShow: false },
  { key: 'board',  action: 'view_data',     name: '数据看板', desc: '实时票数 / 情绪',  icon: '📊', page: '/pages/staff/dashboard/dashboard', needShow: true }
]

Page({
  data: {
    staff: { name: '', roleName: '', role: '' },
    greeting: '你好',
    currentShow: null,     // 当前 live/upcoming 场次
    liveShowId: '',        // 正在进行的（live）演出 id：其它功能执行前必须先有它
    canShowControl: false, // 是否有开场/散场权限
    funcs: [],             // 按权限过滤后的功能项
    notices: []
  },

  unsub: null,

  onLoad() {
    this.unsub = store.subscribe((s) => {
      if (!s.isStaff) {
        // 已退出：回游客端
        wx.reLaunch({ url: '/pages/home/home' })
        return
      }
      const staff = s.staff || { name: '工作人员', roleName: '', role: '' }
      this.setData({
        staff,
        greeting: this.greet(),
        funcs: FUNC_ITEMS
          .filter((f) => perm.staffCan(f.action))
          .map((f) => Object.assign({}, f, { can: true }))
      })
    })
    this.loadShow()
  },

  onShow() {
    // 从子页返回时刷新通知与功能
    this.loadShow()
  },

  onUnload() {
    if (this.unsub) this.unsub()
  },

  greet() {
    const h = new Date().getHours()
    if (h < 6) return '夜深了'
    if (h < 12) return '早上好'
    if (h < 14) return '中午好'
    if (h < 18) return '下午好'
    return '晚上好'
  },

  // 取当前演出（优先 live，否则 upcoming），并拉取现场通知
  loadShow() {
    const pick = (list) => {
      const live = list.find((s) => s.status === 'live')
      const up = list.find((s) => s.status === 'upcoming')
      return { cur: live || up || null, liveId: live ? live.id : '' }
    }
    api.getShows('all').then((list) => {
      const { cur, liveId } = pick(list)
      this.setData({
        currentShow: cur,
        liveShowId: liveId,
        canShowControl: perm.staffCan('show_control')
      })
      if (cur) {
        api.getShowRoom(cur.id).then((d) => {
          this.setData({ notices: d.notices || [] })
        })
      } else {
        this.setData({ notices: [] })
      }
    })
  },

  // 跳转功能子页（各功能独立分页）
  onFunc(e) {
    const item = e.currentTarget.dataset.item
    if (!item || !item.page) return
    // 「场次管理」始终可达（用于添加 / 开始演出）；其它功能执行前必须先有正在进行的表演
    if (item.needShow && item.key !== 'show') {
      if (!this.data.liveShowId) {
        wx.showToast({ title: '请先在场次管理开始一场正在进行的表演', icon: 'none' })
        return
      }
      wx.navigateTo({ url: `${item.page}?id=${this.data.liveShowId}` })
      return
    }
    const url = item.needShow
      ? `${item.page}?id=${(this.data.currentShow && this.data.currentShow.id) || ''}`
      : item.page
    wx.navigateTo({ url })
  },

  // 开场 / 散场
  onToggleShow() {
    const cur = this.data.currentShow
    if (!cur) return
    const toEnded = cur.status === 'live'
    const next = toEnded ? 'ended' : 'live'
    const tip = toEnded ? '确认结束本场演出？' : '确认开始本场演出？'
    wx.showModal({
      title: '演出状态',
      content: tip,
      confirmText: toEnded ? '结束' : '开始',
      confirmColor: '#C8161D',
      success: (r) => {
        if (!r.confirm) return
        api.setShowStatus(cur.id, next).then(() => {
          wx.showToast({ title: toEnded ? '已结束演出' : '已开始演出', icon: 'success' })
          this.loadShow()
        }).catch((err) => {
          wx.showToast({ title: '操作失败：' + (err && err.message ? err.message : '无权限'), icon: 'none' })
        })
      }
    })
  },

  // 退出工作人员登录：回游客端首页
  onLogout() {
    wx.showModal({
      title: '退出工作人员登录',
      content: '将退出当前工作人员身份，返回游客端。',
      confirmText: '退出',
      confirmColor: '#C8161D',
      success: (r) => {
        if (r.confirm) {
          store.clearStaff()
          wx.reLaunch({ url: '/pages/home/home' })
        }
      }
    })
  }
})
