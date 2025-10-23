import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MagazineCoverService } from '@/lib/magazineCoverService'

/**
 * 生成杂志封面API
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { initialPrompt, answers, scenes, story } = body
    
    console.log('📰 [MAGAZINE-COVER-API] 收到封面生成请求')
    console.log('   Initial Prompt:', initialPrompt)
    console.log('   Answers:', answers?.length)
    
    // 调用杂志封面服务生成封面
    const cover = await MagazineCoverService.generateMagazineCover(
      scenes,
      story,
      initialPrompt,
      answers
    )
    
    if (!cover) {
      return NextResponse.json(
        { error: '封面生成失败，请重试' },
        { status: 500 }
      )
    }
    
    console.log('✅ [MAGAZINE-COVER-API] 封面生成成功')
    
    return NextResponse.json({
      success: true,
      cover
    })
    
  } catch (error) {
    console.error('❌ [MAGAZINE-COVER-API] 封面生成失败:', error)
    return NextResponse.json(
      { error: '封面生成失败' },
      { status: 500 }
    )
  }
}

