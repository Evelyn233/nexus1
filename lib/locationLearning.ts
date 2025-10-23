/**
 * 地点学习系统
 * 从用户对话中学习常去的地点
 */

/**
 * 从用户输入中提取地点
 */
export function extractLocationsFromText(text: string, userCity: string = '上海'): string[] {
  const locations: string[] = []
  
  // 上海地点关键词
  const shanghaiLocations = [
    '武康路', '田子坊', '巨鹿路', '愚园路', '衡山路', '淮海路',
    '静安', '徐汇', '虹桥', '张江', '五角场', '新天地',
    '世纪公园', '复兴公园', '苏州河', '人民广场', '南京路',
    '多伦路', 'M50', '思南', '安福路', '永康路', '长乐路',
    '陆家嘴', '外滩', '黄浦江', // 虽然不推荐，但如果用户说了也要记录
    'WeWork', 'Manner', 'Starbucks', '星巴克'
  ]
  
  // 北京地点关键词
  const beijingLocations = [
    '中关村', '望京', '国贸', '三里屯', '南锣鼓巷', '798',
    '什刹海', '后海', '钟鼓楼', '王府井', '西单', 'SKP',
    '奥森', '朝阳公园', '杨梅竹斜街', '鼓楼东大街'
  ]
  
  const locationKeywords = userCity === '上海' ? shanghaiLocations :
                          userCity === '北京' ? beijingLocations :
                          shanghaiLocations
  
  // 检测地点
  locationKeywords.forEach(loc => {
    if (text.includes(loc)) {
      locations.push(loc)
    }
  })
  
  // 检测常见场所类型
  const venuePatterns = [
    { pattern: /(咖啡厅|咖啡店|咖啡馆|cafe)/, type: '咖啡厅' },
    { pattern: /(公园|绿地|广场)/, type: '公园' },
    { pattern: /(办公室|写字楼|科技园|创业园)/, type: '办公场所' },
    { pattern: /(家里|家中|家|阳台|客厅|卧室)/, type: '家' },
    { pattern: /(餐厅|饭店|食堂)/, type: '餐厅' },
    { pattern: /(商场|购物中心|mall)/, type: '商场' },
    { pattern: /(图书馆|书店|书局)/, type: '图书馆/书店' },
    { pattern: /(健身房|gym)/, type: '健身房' },
  ]
  
  venuePatterns.forEach(({ pattern, type }) => {
    if (pattern.test(text)) {
      locations.push(type)
    }
  })
  
  return [...new Set(locations)]  // 去重
}

/**
 * 更新用户的常去地点元数据
 */
export async function updateFrequentLocations(
  userInput: string,
  userId: string,
  userCity: string = '上海'
) {
  const locations = extractLocationsFromText(userInput, userCity)
  
  if (locations.length === 0) {
    console.log('ℹ️ [LOCATION-LEARNING] 未检测到地点信息')
    return
  }
  
  console.log('🗺️ [LOCATION-LEARNING] 检测到地点:', locations)
  
  try {
    // 获取现有常去地点
    const response = await fetch('/api/user/metadata')
    if (!response.ok) return
    
    const { metadata } = await response.json()
    const existingLocations = metadata?.frequentLocations ? 
      JSON.parse(metadata.frequentLocations) : []
    
    // 合并新地点（去重，最多保留15个）
    const updatedLocations = [...new Set([...existingLocations, ...locations])].slice(0, 15)
    
    console.log('🗺️ [LOCATION-LEARNING] 更新后的常去地点:', updatedLocations)
    
    // 更新到数据库
    await fetch('/api/user/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: {
          frequentLocations: JSON.stringify(updatedLocations)
        },
        source: 'location_learning',
        reasoning: `从对话中学习到用户去过：${locations.join('、')}`
      })
    })
    
    console.log('✅ [LOCATION-LEARNING] 常去地点已更新到Prisma')
  } catch (error) {
    console.error('❌ [LOCATION-LEARNING] 更新地点失败:', error)
  }
}

