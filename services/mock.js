// services/mock.js —— 前端演示用本地数据集
// 真实环境将由云函数返回；结构与此保持一致，便于后续无缝替换。
// 注意：所有封面/配图均用 CSS 渐变（gradient 字段）渲染，不依赖外链图片。

const GRAD = {
  red: 'linear-gradient(135deg,#C8161D 0%,#7A0A10 100%)',
  ember: 'linear-gradient(135deg,#E23744 0%,#9E0B11 100%)',
  gold: 'linear-gradient(135deg,#E8A33D 0%,#C8161D 100%)',
  ink: 'linear-gradient(135deg,#2B2B2B 0%,#5A1A1D 100%)',
  dawn: 'linear-gradient(135deg,#F6D365 0%,#C8161D 100%)',
  mist: 'linear-gradient(135deg,#8E9EAB 0%,#3A3A3A 100%)'
}

const reading = [
  { id: 'r1', title: '红船起航', progress: 100, last: '昨天 21:14', gradient: GRAD.red },
  { id: 'r2', title: '延安灯火', progress: 64, last: '今天 08:02', gradient: GRAD.ink }
]

const shows = [
  { id: 's1', title: '《星火》沉浸式实景演出', venue: '红船剧场 · 主舞台', date: '2026-07-18 19:30', status: 'live', gradient: GRAD.ember, segment: '第二幕 · 突围', online: 1284, pollOpen: true },
  { id: 's2', title: '《长征组歌》光影剧', venue: '长征广场 · 水幕', date: '2026-07-18 20:00', status: 'upcoming', gradient: GRAD.gold, segment: '未开始', online: 0, pollOpen: false },
  { id: 's3', title: '《延安纪事》互动话剧', venue: '延安窑洞 · 情景厅', date: '2026-07-18 18:00', status: 'ended', gradient: GRAD.ink, segment: '已落幕', online: 0, pollOpen: false },
  { id: 's4', title: '《烽火家书》沉浸剧场', venue: '烽火台 · 密室', date: '2026-07-19 19:00', status: 'upcoming', gradient: GRAD.dawn, segment: '未开始', online: 0, pollOpen: false }
]

const poll = {
  question: '你认为主角此刻应当如何抉择？',
  options: [
    { id: 'o1', label: '冒险突围', votes: 412 },
    { id: 'o2', label: '蛰伏待机', votes: 286 },
    { id: 'o3', label: '寻求外援', votes: 198 }
  ]
}

const emotions = [
  { id: 'e1', label: '感动', color: '#E23744' },
  { id: 'e2', label: '震撼', color: '#E8A33D' },
  { id: 'e3', label: '激昂', color: '#C8161D' },
  { id: 'e4', label: '沉思', color: '#6B6661' }
]

const branch = {
  current: '你已选择「冒险突围」分支',
  locked: true,
  text: '枪声响起，主角攥紧胸前的家书，转身没入夜色。这一路，注定九死一生，但火种不能灭。'
}

const notices = [
  { id: 'n1', text: '场务提示：第二幕即将切换灯光', time: '19:32' },
  { id: 'n2', text: '演员已就位，请保持安静', time: '19:30' },
  { id: 'n3', text: '投票通道已开启，欢迎参与剧情', time: '19:28' }
]

const scenes = [
  { id: 'sc1', name: '红船旭日', gradient: GRAD.red,   colors: ['#C8161D', '#7A0A10'], desc: '南湖晨光，希望初升' },
  { id: 'sc2', name: '井冈翠竹', gradient: GRAD.ember, colors: ['#E23744', '#9E0B11'], desc: '竹海苍翠，星火点点' },
  { id: 'sc3', name: '雪山丰碑', gradient: GRAD.mist,  colors: ['#8E9EAB', '#3A3A3A'], desc: '风雪漫漫，信仰如钢' },
  { id: 'sc4', name: '延安晨曦', gradient: GRAD.dawn,  colors: ['#F6D365', '#C8161D'], desc: '宝塔破晓，灯火可亲' },
  { id: 'sc5', name: '天安门红', gradient: GRAD.gold,  colors: ['#E8A33D', '#C8161D'], desc: '城楼巍峨，山河无恙' },
  { id: 'sc6', name: '长征星河', gradient: GRAD.ink,   colors: ['#2B2B2B', '#5A1A1D'], desc: '万里星河，步履不停' }
]

const quotes = [
  '星星之火，可以燎原。',
  '为有牺牲多壮志，敢教日月换新天。',
  '江山就是人民，人民就是江山。',
  '一代人有一代人的长征。'
]

const postcards = [
  { id: 'p1', scene: '红船旭日', gradient: GRAD.red, colors: ['#C8161D', '#7A0A10'], quote: quotes[0], date: '2026-07-17', orient: 'land', arrange: 'h', font: 'maoti', position: 'center' },
  { id: 'p2', scene: '延安晨曦', gradient: GRAD.dawn, colors: ['#F6D365', '#C8161D'], quote: quotes[2], date: '2026-07-15', orient: 'port', arrange: 'v', font: 'yan', position: 'br' }
]

const orders = [
  { id: 'o1', title: '红色记忆帆布包', spec: '经典款 / 米白', price: 39, status: '已完成', gradient: GRAD.gold },
  { id: 'o2', title: '《星火》演出纪念册', spec: '精装 / 签名版', price: 68, status: '配送中', gradient: GRAD.ember }
]

module.exports = { GRAD, reading, shows, poll, emotions, branch, notices, scenes, quotes, postcards, orders }
