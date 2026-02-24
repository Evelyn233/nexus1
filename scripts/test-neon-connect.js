/**
 * 测试本机能否连上 Neon 数据库主机（仅 TCP，不涉及 Prisma）
 * 运行: node scripts/test-neon-connect.js
 */
const net = require('net')
const host = 'ep-gentle-wave-a458k1e4-pooler.us-east-1.aws.neon.tech'
const port = 5432

console.log(`正在连接 ${host}:${port} ...`)

const socket = net.createConnection({ host, port, timeout: 10000 }, () => {
  console.log('✅ TCP 连接成功：本机可以连到 Neon 主机')
  socket.destroy()
  process.exit(0)
})

socket.on('error', (err) => {
  console.log('❌ 连接失败:', err.message)
  console.log('')
  console.log('可能原因：')
  console.log('  1. Neon 项目已暂停 → 打开 https://console.neon.tech 点 Restore')
  console.log('  2. 网络/防火墙封了 5432 → 换网络或关 VPN 再试')
  process.exit(1)
})

socket.on('timeout', () => {
  console.log('❌ 连接超时：主机无响应')
  socket.destroy()
  process.exit(1)
})
