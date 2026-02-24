import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { insertRagChunk } from '@/lib/ragNeon'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/** 从 PDF 提取文本（pdf-parse v2: PDFParse + getText） */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()
    return (result?.text ?? '')?.trim() || ''
  } catch {
    return ''
  }
}

/**
 * POST: 上传 Word/PDF，提取文本后写入 Neon RAG（无 Python 后端）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file or invalid file' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const name = (file.name || '').toLowerCase()
    const ext = name.split('.').pop() || ''

    let text: string
    if (ext === 'docx' || ext === 'doc') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value || ''
    } else if (ext === 'pdf') {
      text = await extractPdfText(buffer)
    } else {
      return NextResponse.json(
        { error: 'Unsupported type. Use .docx, .doc, or .pdf' },
        { status: 400 }
      )
    }

    const trimmed = text.trim().slice(0, 50000)
    if (!trimmed) {
      return NextResponse.json({ error: 'No text extracted from file' }, { status: 400 })
    }

    const result = await insertRagChunk(user.id, trimmed)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message || 'RAG 写入失败，请确认 ARK_API_KEY 与 pgvector 表已配置' },
        { status: 500 }
      )
    }
    return NextResponse.json({ ok: true, message: 'File indexed' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Index file failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
