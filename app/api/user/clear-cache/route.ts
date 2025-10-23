import { NextResponse } from 'next/server'

/**
 * 清理localStorage缓存的API
 * 客户端调用后会清除旧的localStorage数据
 */
export async function POST() {
  return NextResponse.json({
    success: true,
    message: '请在浏览器控制台运行: localStorage.clear() 然后刷新页面'
  })
}

