import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

/**
 * Upload any file from device and return URL
 * POST /api/file/upload (multipart/form-data, field: file)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 80)
    const finalFilename = `${timestamp}-${safeName}`

    const uploadDir = join(process.cwd(), 'public', 'uploaded-images')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }
    const filepath = join(uploadDir, finalFilename)
    await writeFile(filepath, buffer)

    const localPath = `/uploaded-images/${finalFilename}`
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const fullUrl = `${baseUrl}${localPath}`

    return NextResponse.json({
      success: true,
      url: fullUrl,
      localPath,
      filename: finalFilename,
      originalName: file.name,
    })
  } catch (error) {
    console.error('[FILE-UPLOAD] Error:', error)
    return NextResponse.json(
      { error: 'File upload failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
