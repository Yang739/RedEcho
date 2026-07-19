// services/fonts.js —— 明信片字体风格注册中心
//
// 设计要点：
// 1. UI 只展示「修饰词」（大气磅礴 / 铁画银钩 / 雄浑端庄 / 清健瘦劲），不展示具体字体名。
// 2. 每个风格含 weight / family（供 Canvas 与 CSS 共用），以及字体来源二选一：
//    - url：静态 https 地址（自有 CDN / 服务器），填了就直接用。
//    - cloudId：微信云存储 FileID（cloud://...），由 loadFonts() 经 wx.cloud.getTempFileURL
//      换成临时 https 地址后加载（本项目已开通云开发，推荐此方式，无需自建服务器）。
//    都不填则回退系统字体（STKaiti/STXingkai 等近似风格），体验无损。
// 3. 小程序字体必须经 https 加载（wx.loadFontFace 不能直接读包内静态文件，且包体装不下大字体），
//    故采用 url 注入方式。
//
// —— 部署步骤（详见对话说明）：把 4 个 ttf 传到云存储 /fonts/，复制各自的 FileID 填到下方 cloudId。

const FONTS = {
  maoti: {
    adjective: '大气磅礴',
    desc: '挥洒纵横 · 毛体风骨',
    weight: '700',
    family: "'RE-Mao','STKaiti','KaiTi','Kaiti SC',serif",
    url: '',
    cloudId: '' // 例：'cloud://cloud1-d1g61edjla151e7c2.xxxx/fonts/maozedong-1.ttf'
  },
  shoujin: {
    adjective: '铁画银钩',
    desc: '瘦劲清峻 · 瘦金意趣',
    weight: '400',
    family: "'RE-Shou','STXingkai','Xingkai SC',serif",
    url: '',
    cloudId: '' // 'cloud://cloud1-d1g61edjla151e7c2.xxxx/fonts/AaSongHuiZongGuoBaoShouJinShu-2.ttf'
  },
  yan: {
    adjective: '雄浑端庄',
    desc: '丰腴正大 · 颜体气象',
    weight: '800',
    family: "'RE-Yan','STKaiti','KaiTi',serif",
    url: '',
    cloudId: '' // 'cloud://cloud1-d1g61edjla151e7c2.xxxx/fonts/经典繁颜体字体下载_爱给网_aigei_com.ttf'
  },
  liu: {
    adjective: '清健瘦劲',
    desc: '骨力遒劲 · 柳体筋骨',
    weight: '600',
    family: "'RE-Liu','LiSu','STLiti','Kaiti SC',serif",
    url: '',
    cloudId: '' // 'cloud://cloud1-d1g61edjla151e7c2.xxxx/fonts/柳公权柳体_爱给网_aigei_com.ttf'
  }
}

// 从 family 取首选字体族名（去掉引号），作为 loadFontFace 的 family
function firstFamily(family) {
  return family.split(',')[0].replace(/['"]/g, '').trim()
}

// 加载单个字体（f 需含可用 url 或 _url）
function loadOne(f) {
  const src = f.url || f._url
  if (!src) return
  wx.loadFontFace({
    family: firstFamily(f.family),
    source: 'url("' + src + '")',
    success() {},
    fail(err) {
      // 失败时保持系统字体回退，不阻塞渲染
      if (typeof console !== 'undefined') {
        console.warn('[fonts] 加载失败', firstFamily(f.family), err)
      }
    }
  })
}

// 拉起内置字体加载：静态 url 直接加载；cloudId 先换临时 https 地址（同一会话内缓存，避免重复云调用）
function loadFonts() {
  if (typeof wx === 'undefined' || !wx.loadFontFace) return

  const entries = Object.keys(FONTS).map((key) => ({ key, f: FONTS[key] }))
  const direct = entries.filter((e) => e.f.url)
  const cloud = entries.filter((e) => !e.f.url && e.f.cloudId)

  // 1) 静态 url 直接加载
  direct.forEach((e) => loadOne(e.f))

  // 2) 云存储 FileID → 临时 https 地址 → 加载
  if (cloud.length && wx.cloud && typeof wx.cloud.getTempFileURL === 'function') {
    const fileList = cloud.map((e) => e.f.cloudId)
    wx.cloud.getTempFileURL({
      fileList,
      success(res) {
        const urlMap = {}
        ;(res.fileList || []).forEach((item) => {
          if (item && item.fileID && item.tempFileURL) urlMap[item.fileID] = item.tempFileURL
        })
        cloud.forEach((e) => {
          const u = urlMap[e.f.cloudId]
          if (u) {
            e.f.url = u // 会话内缓存，下次 loadFonts 走 direct 分支，省一次云调用
            loadOne(e.f)
          }
        })
      },
      fail() {}
    })
  }
}

module.exports = { FONTS, loadFonts }
