// pages/about/about.js
Page({
  data: {
    version: '1.0.0',
    year: 2026,
    intro: '红韵智演是一款应用于红色旧址的思政教育小程序。通过「真人演员表演 + 游客实时投票决策 + AIGC 生成内容」，让游客从旁观者变为参与者，在沉浸式互动演出中感悟红色历史，并带走一份专属的个性化纪念。',
    features: [
      { icon: '演', title: '沉浸式演出', desc: '加入演出房间，用手机实时投票决定剧情走向，表情反馈直上大屏。' },
      { icon: '创', title: 'AIGC 明信片', desc: '选场景、写金句、挑版式，一键生成专属红色明信片，可保存、分享、打印。' },
      { icon: '读', title: '红色阅读', desc: '精选湖南主题红色史料，随时阅读收藏，在「我的阅读」留下红色足迹。' },
      { icon: '勋', title: '互动激励', desc: '参与演出与阅读获取积分，见证从新兵到宣传员的成长之路。' }
    ]
  },

  onLoad() {
    this.setData({ year: new Date().getFullYear() })
  },

  onShareAppMessage() {
    return {
      title: '红韵智演 · 红色旧址沉浸式互动演出',
      path: '/pages/home/home'
    }
  }
})
