/**
 * 检查 RAG 服务是否已启动（用于「Query my database」）
 * 在 profile 根目录运行: node scripts/check-rag.js
 */
const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')

function loadEnv(file) {
  const p = path.join(__dirname, '..', file)
  if (!fs.existsSync(p)) return
  const content = fs.readFileSync(p, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*RAG_API_URL\s*=\s*(.+)$/)
    if (m) {
      const val = m[1].replace(/^["']|["']$/g, '').trim()
      return val
    }
  }
}

const baseUrl = loadEnv('.env.local') || loadEnv('.env') || process.env.RAG_API_URL || 'http://localhost:8000'
const url = new URL(baseUrl.replace(/\/$/, ''))

function fetch(urlStr, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr)
    const lib = u.protocol === 'https:' ? https : http
    const req = lib.get(urlStr, { timeout: opts.timeout || 5000 }, (res) => {
      let data = ''
      res.on('data', (ch) => { data += ch })
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode === 200, status: res.statusCode, data: JSON.parse(data) })
        } catch {
          resolve({ ok: false, status: res.statusCode, data: {} })
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

async function main() {
  console.log('RAG 地址:', baseUrl)
  console.log('')
  try {
    const health = await fetch(`${baseUrl.replace(/\/$/, '')}/health`)
    if (!health.ok) {
      console.log('❌ RAG 未启动（/health 返回', health.status, '）')
      console.log('')
      console.log('请先启动 RAG：')
      console.log('  1. 在 profile 根目录双击 start-rag.bat')
      console.log('  2. 或在此目录运行: cd rag-service && python -m uvicorn main:app --host 0.0.0.0 --port 8000')
      console.log('  3. 看到 "Uvicorn running on http://0.0.0.0:8000" 后不要关窗口，再运行本脚本')
      process.exit(1)
    }
    console.log('✅ RAG 服务已启动')
    try {
      const stats = await fetch(`${baseUrl.replace(/\/$/, '')}/stats`)
      const count = stats.data?.processed_count
      if (typeof count === 'number') {
        if (count === 0) {
          console.log('   索引: 空（请在「增加数据库」里粘贴文本或上传 Word/PDF 添加内容）')
        } else {
          console.log('   索引:', count, '篇文档')
        }
      }
    } catch {
      console.log('   无法获取 /stats')
    }
  } catch (e) {
    const errMsg = (e && (e.code || e.message)) || (e instanceof Error ? e.message : String(e)) || '无法连接 ' + baseUrl
    console.log('❌ RAG 未启动（连接失败）')
    console.log('   错误:', errMsg)
    if (errMsg.includes('ECONNREFUSED') || errMsg.includes('refused')) {
      console.log('   说明: 本机 8000 端口没有进程在监听，请先启动 RAG（见下方步骤）。')
    }
    console.log('')
    console.log('请先启动 RAG（另开一个终端窗口，不要关）：')
    console.log('  1. 在 profile 根目录双击 start-rag.bat')
    console.log('  2. 或在此目录运行: cd rag-service && python -m uvicorn main:app --host 0.0.0.0 --port 8000')
    console.log('  3. 若端口 8000 被占用，可改用 8001，并在 .env.local 中设置 RAG_API_URL=http://localhost:8001')
    process.exit(1)
  }
}

main()
