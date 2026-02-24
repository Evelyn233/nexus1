/**
 * 检查 .env 里的 DATABASE_URL 是否适合连接 Neon（不打印密码）
 * 运行: node scripts/check-db-url.js
 */
const fs = require('fs')
const path = require('path')

function loadEnv(file) {
  const p = path.join(__dirname, '..', file)
  if (!fs.existsSync(p)) return
  const content = fs.readFileSync(p, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)$/)
    if (m) {
      const val = m[1].replace(/^["']|["']$/g, '').trim()
      return val
    }
  }
}

const url = loadEnv('.env.local') || loadEnv('.env') || process.env.DATABASE_URL
if (!url) {
  console.log('❌ DATABASE_URL 未设置（.env / .env.local 中都没有）')
  process.exit(1)
}

const hasSsl = /[?&]sslmode=/.test(url)
const isNeon = url.includes('neon.tech')
const masked = url.replace(/:[^:@]+@/, ':****@')

console.log('✅ DATABASE_URL 已设置')
console.log('   前缀:', masked.substring(0, 60) + '...')
console.log('   含 sslmode:', hasSsl ? '是' : '否')
console.log('   Neon 地址:', isNeon ? '是' : '否')

if (isNeon && !hasSsl) {
  console.log('\n⚠️ Neon 必须使用 SSL。请在 .env 的 DATABASE_URL 末尾加上 ?sslmode=require（或 &sslmode=require）')
  process.exit(1)
}

console.log('\n若仍 P1001，请到 https://console.neon.tech 检查项目是否被暂停（Suspended），若是请点 Restore。')
process.exit(0)
