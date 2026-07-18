// deploy/upload.js
// 使用 miniprogram-ci 将小程序代码（主包 + 分包）上传到微信平台。
// 云函数不在此脚本内上传（见 deploy/README.md 的「B. 云函数部署」）。
//
// 使用步骤：
//   1. npm install            （安装 miniprogram-ci）
//   2. 到小程序后台「开发管理 - 开发设置 - 上传密钥」下载 private.xxx.key 到本地
//   3. 把下面的 PRIVATE_KEY_PATH / VERSION / DESC 改成你自己的值
//   4. npm run deploy         （等价 node deploy/upload.js）
//
// 注意：本脚本只上传「小程序前端代码」，不会上传云函数本身。

const path = require('path')

// —— 需自行填写的参数 ——
// AppID：必须与实际小程序一致（当前项目为 wxac6829a175131da4，勿改）
const APPID = 'wxac6829a175131da4'
// 上传密钥：从小程序后台下载，建议放在项目外的安全目录，不要提交到 git
const PRIVATE_KEY_PATH = path.resolve(__dirname, '../keys/private.key') // TODO: 改成你的私钥路径
// 上传版本号（每次上传递增，如 1.0.1）
const VERSION = '1.0.0'
// 上传备注
const DESC = 'RedEcho 前端代码上传'
// 小程序代码根目录（deploy/ 的上一级）
const PROJECT_PATH = path.resolve(__dirname, '..')

// 确保依赖已安装；未安装时给出明确提示而非崩溃
let ci
try {
  ci = require('miniprogram-ci')
} catch (e) {
  console.error('[deploy] 未找到 miniprogram-ci，请先执行：npm install')
  process.exit(1)
}

const project = new ci.Project({
  appid: APPID,
  type: 'miniProgram',
  projectPath: PROJECT_PATH,
  privateKeyPath: PRIVATE_KEY_PATH,
  // 上传时忽略：依赖、密钥、文档、云函数源码（云函数单独部署）
  ignores: [
    'node_modules/**/*',
    'keys/**/*',
    'docs/**/*',
    'cloudfunctions/**/*',
    'deploy/**/*'
  ]
})

console.log('[deploy] 开始上传小程序代码...')
console.log('[deploy] appid   =', APPID)
console.log('[deploy] version =', VERSION)
console.log('[deploy] project =', PROJECT_PATH)

ci.upload({
  project,
  version: VERSION,
  desc: DESC,
  setting: {
    es6: true,
    minify: true,
    postcss: true,
    minifyWXSS: true
  },
  onProgressUpdate: (info) => {
    // info 形如 { type, data }，data 为进度文本
    if (info && info.data) console.log('[deploy]', info.data)
  }
})
  .then((res) => {
    console.log('[deploy] 上传成功 ✅', res)
    process.exit(0)
  })
  .catch((err) => {
    console.error('[deploy] 上传失败 ❌', err)
    process.exit(1)
  })
