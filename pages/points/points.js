// pages/points/points.js —— 积分明细（流水）
const store = require('../../store.js')

function pad(n) { return n < 10 ? '0' + n : '' + n }

function dayKey(ts) {
  const d = new Date(ts)
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

function fmtTime(ts) {
  const d = new Date(ts)
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

// 把明细按「今天 / 昨天 / MM月DD日」分组，组内与组间均为倒序（最新在前）
function groupLog(log) {
  const today = dayKey(Date.now())
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yKey = dayKey(y.getTime())
  const groups = []
  const map = {}
  for (const e of log) {
    const k = dayKey(e.time)
    let label
    if (k === today) label = '今天'
    else if (k === yKey) label = '昨天'
    else {
      const d = new Date(e.time)
      label = (d.getMonth() + 1) + '月' + d.getDate() + '日'
    }
    if (!map[label]) { map[label] = []; groups.push({ label: label, items: map[label] }) }
    map[label].push(Object.assign({}, e, { timeText: fmtTime(e.time) }))
  }
  return groups
}

Page({
  data: { points: 0, todayGain: 0, groups: [] },
  unsub: null,

  onLoad() {
    this.unsub = store.subscribe((s) => {
      this.setData({
        points: s.points,
        todayGain: s.todayGain,
        groups: groupLog(s.log || [])
      })
    })
  },

  onUnload() {
    if (this.unsub) this.unsub()
  }
})
