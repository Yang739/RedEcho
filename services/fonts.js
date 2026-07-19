// services/fonts.js —— 明信片字体风格注册中心
//
// 设计要点：
// 1. UI 只展示「修饰词」（大气磅礴 / 铁画银钩 / 雄浑端庄 / 清健瘦劲），不展示具体字体名。
// 2. 每个风格含 weight / family（供 Canvas 与 CSS 共用）与可选 url（供 wx.loadFontFace 加载内置字体）。
// 3. 内置字体加载：把 4 个授权字体文件(.ttf/.woff)托管到「downloadFile 合法域名」后，
//    在对应 style 的 url 填入地址即可由 loadFonts() 自动加载；未填则回退下方系统字体（近似风格）。
//    —— 说明：毛体/瘦金体/颜体/柳体为特定书法风格，受字体授权限制无法随包自由分发；
//       平台也要求字体经 https URL 加载（不能直接读包内静态字体文件），故采用 url 注入方式。
//       填写 url 后，CSS/Canvas 的字体族首位即为该内置字体，未加载时自动回退系统字体，体验无损。

const FONTS = {
  maoti: {
    adjective: '大气磅礴',
    desc: '挥洒纵横 · 毛体风骨',
    weight: '700',
    family: "'RE-Mao','STKaiti','KaiTi','Kaiti SC',serif",
    url: '' // 例：'https://your-cdn.com/fonts/maoti.ttf'
  },
  shoujin: {
    adjective: '铁画银钩',
    desc: '瘦劲清峻 · 瘦金意趣',
    weight: '400',
    family: "'RE-Shou','STXingkai','Xingkai SC',serif",
    url: ''
  },
  yan: {
    adjective: '雄浑端庄',
    desc: '丰腴正大 · 颜体气象',
    weight: '800',
    family: "'RE-Yan','STKaiti','KaiTi',serif",
    url: ''
  },
  liu: {
    adjective: '清健瘦劲',
    desc: '骨力遒劲 · 柳体筋骨',
    weight: '600',
    family: "'RE-Liu','LiSu','STLiti','Kaiti SC',serif",
    url: ''
  }
}

// 拉起内置字体加载（url 为空则跳过，使用系统字体回退）
function loadFonts() {
  if (typeof wx === 'undefined' || !wx.loadFontFace) return
  Object.keys(FONTS).forEach((key) => {
    const f = FONTS[key]
    if (!f.url) return
    const family = f.family.split(',')[0].replace(/['"]/g, '')
    wx.loadFontFace({
      family,
      source: 'url("' + f.url + '")',
      success() {},
      fail() {}
    })
  })
}

module.exports = { FONTS, loadFonts }
