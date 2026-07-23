// packages/show/pages/room/room.js
const api = require('../../../../services/api.js')
const rewards = require('../../../../services/rewards.js')
const storage = require('../../../../services/storage.js')
const store = require('../../../../store.js')
const perm = require('../../../../services/permission.js')

function computePct(options) {
  const total = options.reduce((s, o) => s + o.votes, 0) || 1
  return options.map((o) => Object.assign({}, o, { pct: Math.round((o.votes / total) * 100) }))
}

Page({
  data: {
    showId: '',
    show: { title: '', segment: '', online: 0, gradient: '', status: '', pollOpen: false },
    poll: { question: '', options: [] },
    emotions: [],
    notices: [],
    messages: [],
    voted: '',
    selectedEmotion: '',
    inputValue: '',
    statusBanner: '',
    isEnded: false,
    isLive: false,      // 是否直播中
    isUpcoming: false,  // 是否未开始
    unlocked: false,    // 本场邀请码是否已核验解锁互动
    gateNeeded: false,  // 是否需要邀请码门禁（仅直播中 且 未解锁）
    inviteInput: '',
    inviteError: '',
    // ===== 工作人员管理态（manage=1 时生效） =====
    manage: false,        // 是否以管理身份进入
    isManage: false,
    canShowControl: false,
    canPollManage: false,
    canInviteSet: false,
    canNoticePush: false,
    canBranchLock: false,
    canStagePush: false,
    pollOpen: false,
    inviteInput2: '',
    noticeInput: '',
    branchOptions: [
      { id: 'b1', label: '孤胆突围' },
      { id: 'b2', label: '隐忍潜伏' },
      { id: 'b3', label: '千里求援' }
    ],
    branchChoice: '',
    stageDanmaku: ''
  },

  timer: null,

  onLoad(options) {
    const showId = options.id || 's1'
    const isManage = options.manage === '1'
    this.setData({ showId, manage: isManage, isManage })
    api.getShowRoom(showId).then((d) => {
      const status = d.show.status
      const isLive = status === 'live'
      const isUpcoming = status === 'upcoming'
      // 仅「直播中」的演出计为参与并发 +5（同一场只加一次）；即将开始 / 已结束不发放
      let awardTip = ''
      if (isLive && rewards.awardShow(showId)) {
        awardTip = '参与演出 +5 积分'
      }
      // 邀请码门禁：仅「直播中」场次需要；按场次持久化解锁记录判断，未开始 / 已结束无需门禁
      const unlocked = !!storage.get('rede_invite_unlocked', {})[showId]
      // 恢复本场已持久化的个人选择（投票 / 情绪），退出重进不再丢失
      const votes = storage.get('rede_show_votes', {})
      const emos = storage.get('rede_show_emotions', {})
      const myVote = votes[showId] || ''
      let pollOpts = d.poll.options
      if (myVote) {
        // 重进后把「我的那一票」补回进度条（mock 降级：云端由原子自增保证持久）
        pollOpts = pollOpts.map((o) => o.id === myVote ? Object.assign({}, o, { votes: o.votes + 1 }) : o)
      }
      // 工作人员管理态：按角色算能力标志（游客进入 manage=1 也不显示任何管控）
      const caps = perm.staffCaps(['show_control', 'poll_manage', 'invite_set', 'notice_push', 'branch_lock', 'stage_push'])
      const cfg = storage.get('rede_show_config', {})[showId] || {}
      this.setData({
        show: d.show,
        poll: Object.assign({}, d.poll, { options: computePct(pollOpts) }),
        emotions: d.emotions,
        notices: d.notices,
        statusBanner: status === 'ended' ? '本场演出已落幕' : '',
        isEnded: status === 'ended',
        isLive,
        isUpcoming,
        unlocked,
        gateNeeded: isLive && !unlocked,
        voted: myVote,
        selectedEmotion: emos[showId] || '',
        inviteError: '',
        pollOpen: d.show.pollOpen,
        branchChoice: cfg.branch || '',
        isManage: isManage && (caps.show_control || caps.poll_manage || caps.invite_set || caps.notice_push || caps.branch_lock || caps.stage_push),
        canShowControl: caps.show_control,
        canPollManage: caps.poll_manage,
        canInviteSet: caps.invite_set,
        canNoticePush: caps.notice_push,
        canBranchLock: caps.branch_lock,
        canStagePush: caps.stage_push
      })
      if (awardTip) wx.showToast({ title: awardTip, icon: 'none' })
      // 模拟实时：仅直播且投票开启时轮询结果（降级路径；wss 接入后由 socketClient 替代，见 RedEcho×RPC集成设计）
      if (d.show.pollOpen) {
        this.timer = setInterval(() => this.tick(), 2600)
      }
    })
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
  },

  tick() {
    api.pollResult(this.data.showId).then((opts) => {
      // 轮询刷新时也保留「我的那一票」（mock 降级：云端由服务端票数保证）
      const list = this.data.voted
        ? opts.map((o) => o.id === this.data.voted ? Object.assign({}, o, { votes: o.votes + 1 }) : o)
        : opts
      this.setData({ 'poll.options': computePct(list) })
    })
  },

  onVote(e) {
    if (this.data.voted) return
    const id = e.currentTarget.dataset.id
    api.submitVote(this.data.showId, id).then(() => {
      const opts = this.data.poll.options.map((o) =>
        o.id === id ? Object.assign({}, o, { votes: o.votes + 1 }) : o
      )
      // 按场次持久化已投票选项，退出重进仍保留
      const votes = storage.get('rede_show_votes', {})
      votes[this.data.showId] = id
      storage.set('rede_show_votes', votes)
      this.setData({ voted: id, 'poll.options': computePct(opts) })
      wx.showToast({ title: '投票成功', icon: 'success' })
    })
  },

  onEmotion(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ selectedEmotion: id })
    // 按场次持久化情绪选择，退出重进仍保留
    const emos = storage.get('rede_show_emotions', {})
    emos[this.data.showId] = id
    storage.set('rede_show_emotions', emos)
    api.submitEmotion(this.data.showId, id) //  fire-and-forget
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  // 邀请码输入（实时清除错误提示）
  onInviteInput(e) {
    this.setData({ inviteInput: e.detail.value, inviteError: '' })
  },

  // 核验演出现场邀请码：通过后按场次持久化解锁，互动区放开
  onUnlock() {
    const code = (this.data.inviteInput || '').trim()
    if (!code) {
      this.setData({ inviteError: '请输入邀请码' })
      return
    }
    api.verifyInvite(this.data.showId, code).then((r) => {
      if (r.ok) {
        const map = storage.get('rede_invite_unlocked', {})
        map[this.data.showId] = true
        storage.set('rede_invite_unlocked', map)
        this.setData({ unlocked: true, gateNeeded: false, inviteError: '' })
        wx.showToast({ title: '已解锁互动', icon: 'success' })
      } else {
        this.setData({ inviteError: '邀请码不正确' })
      }
    })
  },

  onSend() {
    const text = (this.data.inputValue || '').trim()
    if (!text) return
    // 弹幕本地预览：真实上行与房间广播将在 wss 阶段接入（见 RedEcho×RPC集成设计 R-T1/R-T5），此处仅本地回显兜底
    const msg = { id: 'm' + Date.now(), text, time: this.now() }
    this.setData({ messages: this.data.messages.concat(msg), inputValue: '' })
  },

  // 演出已结束 → 跳转本场回顾
  goReview() {
    wx.navigateTo({ url: `/packages/show/pages/review/review?id=${this.data.showId}` })
  },

  now() {
    const d = new Date()
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  /* ===================== 工作人员管控（manage=1） ===================== */
  onManageToggleShow() {
    if (!this.data.canShowControl) return
    const cur = this.data.show
    const next = cur.status === 'live' ? 'ended' : 'live'
    wx.showModal({
      title: '演出状态',
      content: next === 'ended' ? '确认结束本场演出？' : '确认开始本场演出？',
      confirmText: next === 'ended' ? '结束' : '开始',
      confirmColor: '#C8161D',
      success: (r) => {
        if (!r.confirm) return
        api.setShowStatus(this.data.showId, next).then(() => {
          this.setData({ 'show.status': next })
          wx.showToast({ title: next === 'ended' ? '已结束演出' : '已开始演出', icon: 'success' })
        })
      }
    })
  },

  onManageTogglePoll() {
    if (!this.data.canPollManage) return
    const open = !this.data.pollOpen
    api.setPoll(this.data.showId, { pollOpen: open }).then(() => {
      this.setData({ pollOpen: open, 'show.pollOpen': open })
      wx.showToast({ title: open ? '投票已开启' : '投票已关闭', icon: 'none' })
    })
  },

  onInviteInput2(e) { this.setData({ inviteInput2: e.detail.value }) },
  onManageSetInvite() {
    if (!this.data.canInviteSet) return
    const code = (this.data.inviteInput2 || '').trim().toUpperCase()
    if (!code) { wx.showToast({ title: '请输入邀请码', icon: 'none' }); return }
    api.setInvite(this.data.showId, code).then(() => {
      this.setData({ 'show.inviteCode': code, inviteInput2: '' })
      wx.showToast({ title: '邀请码已更新', icon: 'success' })
    })
  },

  onNoticeInput(e) { this.setData({ noticeInput: e.detail.value }) },
  onManagePushNotice() {
    if (!this.data.canNoticePush) return
    const text = (this.data.noticeInput || '').trim()
    if (!text) { wx.showToast({ title: '请输入通知内容', icon: 'none' }); return }
    api.pushNotice(this.data.showId, text).then(() => {
      const notices = this.data.notices.slice()
      notices.unshift({ id: 'n' + Date.now(), text, time: this.now() })
      this.setData({ notices, noticeInput: '' })
      wx.showToast({ title: '已推送', icon: 'success' })
    })
  },

  onBranchPick(e) {
    this.setData({ branchChoice: e.currentTarget.dataset.id })
  },
  onManageLockBranch() {
    if (!this.data.canBranchLock) return
    if (!this.data.branchChoice) { wx.showToast({ title: '请选择分支', icon: 'none' }); return }
    api.lockBranch(this.data.showId, this.data.branchChoice).then(() => {
      wx.showToast({ title: '分支已锁定', icon: 'success' })
    })
  },

  onStageDanmakuInput(e) { this.setData({ stageDanmaku: e.detail.value }) },
  onManagePushDanmaku() {
    if (!this.data.canStagePush) return
    const text = (this.data.stageDanmaku || '').trim()
    if (!text) return
    api.pushDanmaku(this.data.showId, text).then(() => {
      this.setData({ stageDanmaku: '' })
      wx.showToast({ title: '已上屏', icon: 'success' })
    })
  },
  onManagePushEmotion(e) {
    if (!this.data.canStagePush) return
    api.pushEmotion(this.data.showId, e.currentTarget.dataset.type).then(() => {
      wx.showToast({ title: '情绪已上屏', icon: 'none' })
    })
  }
})
