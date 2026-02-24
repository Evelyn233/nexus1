import { NextRequest, NextResponse } from 'next/server'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * 调用火山引擎图片编辑API
 * POST /api/image/edit
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { imageUrl, imageData, prompt, size = '2K', watermark = false } = body

    // 如果提供了 base64 图片数据，先上传获取 URL
    if (imageData && !imageUrl) {
      console.log('📤 [IMAGE-EDIT] 检测到 base64 图片，先上传到服务器...')
      
      // 上传图片到服务器
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const uploadResponse = await fetch(`${baseUrl}/api/image/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageData: imageData
        })
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error('❌ [IMAGE-EDIT] 图片上传失败:', errorText)
        return NextResponse.json(
          { error: 'Image upload failed', details: errorText },
          { status: uploadResponse.status }
        )
      }

      const uploadData = await uploadResponse.json()
      imageUrl = uploadData.url
      console.log('✅ [IMAGE-EDIT] 图片上传成功，获得 URL:', imageUrl)
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing imageUrl or imageData' },
        { status: 400 }
      )
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing prompt' },
        { status: 400 }
      )
    }

    // 使用 ARK_API_KEY 或 SEEDREAM_API_KEY（同一 Volces 平台）
    const apiKey = process.env.ARK_API_KEY || process.env.SEEDREAM_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ARK_API_KEY 或 SEEDREAM_API_KEY 未配置' },
        { status: 500 }
      )
    }

    // 若图片是 localhost，Volces 无法抓取：在服务端拉取后转为 base64 再发给 SeeDream（支持 data URI）
    if (imageUrl && (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1'))) {
      try {
        const r = await fetch(imageUrl)
        if (r.ok) {
          const buf = await r.arrayBuffer()
          const b64 = Buffer.from(buf).toString('base64')
          const ct = r.headers.get('content-type') || 'image/jpeg'
          imageUrl = `data:${ct};base64,${b64}`
          console.log('📤 [IMAGE-EDIT] 已将本地图片转为 base64 再发给 SeeDream')
        }
      } catch (e) {
        console.warn('⚠️ [IMAGE-EDIT] 获取本地图片失败，仍用原 URL:', e)
      }
    }

    console.log('🎨 [IMAGE-EDIT] 调用 SeeDream 图片编辑 API (doubao-seedream-4-5-251128)')
    console.log('📊 [IMAGE-EDIT] 参数:', { imageLen: imageUrl?.length, prompt: prompt?.slice(0, 80), size, watermark })

    // 调用火山引擎 SeeDream 图生图/编辑 API
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'doubao-seedream-4-5-251128',
        prompt: prompt,
        image: imageUrl,
        size: size,
        watermark: watermark
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [IMAGE-EDIT] 火山引擎API调用失败:', response.status, errorText)
      return NextResponse.json(
        { error: 'Image edit failed', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✅ [IMAGE-EDIT] 图片编辑成功')

    return NextResponse.json({
      success: true,
      data: data
    })

  } catch (error) {
    console.error('❌ [IMAGE-EDIT] 图片编辑失败:', error)
    return NextResponse.json(
      { error: 'Image edit failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
