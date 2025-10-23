# AI 生图功能说明

## 功能概述

本应用集成了AI生图功能，用户可以通过输入文本描述来生成相关的时尚生活图片，并在界面中实时显示。

## 核心功能

### 1. 智能提示词生成
- 根据用户输入自动生成相关的图片提示词
- 支持多种场景：面试、约会、聚会、工作等
- 自动优化提示词以符合杂志风格

### 2. 实时图片生成
- 使用API Key: `17b4a6a5-1a2b-4c3d-827b-cef480fd1580`
- 生成高质量的时尚生活图片
- 支持自定义尺寸和风格

### 3. 动态内容展示
- 生成的图片会以卡片形式实时添加到界面
- 支持最多4个动态生成的内容卡片
- 保持界面布局的连贯性

## 使用方式

### 用户操作流程
1. 在底部输入框输入需求，如："我明天面试穿什么"
2. 点击"发送"按钮
3. 系统显示"生成中..."状态
4. 自动生成相关图片和推荐内容
5. 新内容以卡片形式添加到界面顶部

### 支持的输入类型
- **面试相关**: "面试穿什么"、"工作面试穿搭"
- **约会相关**: "约会穿什么"、"浪漫约会造型"
- **聚会相关**: "聚会穿什么"、"社交场合穿搭"
- **日常相关**: "日常穿搭"、"休闲造型"

## 技术实现

### API 集成
```typescript
// 生图API调用
const response = await fetch('/api/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: enhancedPrompt })
})
```

### 状态管理
```typescript
const [dynamicContent, setDynamicContent] = useState<any[]>([])
const [isGenerating, setIsGenerating] = useState(false)
```

### 组件结构
- `InputSection`: 处理用户输入和加载状态
- `ContentCard`: 显示生成的图片和内容
- `imageGeneration.ts`: 生图API服务
- `/api/generate-image/route.ts`: Next.js API路由

## 扩展功能

### 可扩展的特性
1. **批量生成**: 一次生成多张相关图片
2. **风格选择**: 支持不同艺术风格
3. **历史记录**: 保存用户生成的内容
4. **分享功能**: 分享生成的图片和推荐

### 自定义配置
- 修改 `lib/imageGeneration.ts` 中的提示词模板
- 调整 `app/api/generate-image/route.ts` 中的图片映射
- 自定义 `ContentCard` 组件的显示样式

## 注意事项

1. **API限制**: 当前使用模拟API，实际部署时需要替换为真实的生图服务
2. **性能优化**: 大量图片生成时考虑添加缓存机制
3. **错误处理**: 网络错误时提供友好的用户提示
4. **响应式设计**: 确保在不同设备上的良好体验

## 部署说明

1. 确保API Key有效且有足够的配额
2. 配置正确的API端点
3. 测试生图功能的稳定性
4. 监控API使用量和性能指标
