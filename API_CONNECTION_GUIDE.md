# API 连接指南

## 🔌 API 连接状态

### 豆包语言模型 API
- **端点**: `https://ark.cn-beijing.volces.com/api/v3/chat/completions`
- **模型**: `deepseek-r1-250120`
- **API Key**: `5376f0d2-88cf-41c8-ab9c-b7701e4fba81`
- **状态**: ✅ 已配置，支持真实API调用

### SeeDream 生图 API
- **端点**: `https://ark.cn-beijing.volces.com/api/v3/images/generations`
- **模型**: `doubao-seedream-4-0-250828`
- **API Key**: `5376f0d2-88cf-41c8-ab9c-b7701e4fba81`
- **状态**: ✅ 已配置，支持真实API调用

## 🧪 测试API连接

### 方法1: 使用测试页面
1. 启动应用: `npm run dev`
2. 访问: `http://localhost:3000/test-api`
3. 输入测试问题，点击"测试API"

### 方法2: 使用curl命令
```bash
# 测试豆包API
curl https://ark.cn-beijing.volces.com/api/v3/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 5376f0d2-88cf-41c8-ab9c-b7701e4fba81" \
  -d '{
    "model": "deepseek-r1-250120",
    "messages": [
      {"role": "system","content": "你是人工智能助手."},
      {"role": "user","content": "常见的十字花科植物有哪些？"}
    ]
  }'
```

## 📋 API调用流程

### 1. 豆包语言模型调用
```typescript
// 位置: lib/doubaoService.ts
const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 5376f0d2-88cf-41c8-ab9c-b7701e4fba81',
  },
  body: JSON.stringify({
    model: 'deepseek-r1-250120',
    messages: messages,
    temperature: 0.7,
    max_tokens: 2000,
    stream: false
  })
})
```

### 2. SeeDream生图API调用
```typescript
// 位置: lib/imageGeneration.ts
const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 5376f0d2-88cf-41c8-ab9c-b7701e4fba81',
  },
  body: JSON.stringify({
    model: 'doubao-seedream-4-0-250828',
    prompt: request.prompt,
    sequential_image_generation: "auto",
    sequential_image_generation_options: {
      max_images: 3
    },
    response_format: "url",
    size: "2K",
    stream: false,
    watermark: true
  })
})
```

## 🔄 双重保障机制

### 主要API + 备用API
1. **首先尝试真实API**: 直接调用豆包和SeeDream API
2. **备用本地API**: 如果真实API失败，自动切换到本地模拟API
3. **错误处理**: 完善的错误处理和用户反馈

### 本地模拟API位置
- 豆包对话API: `/api/doubao-chat`
- 生图API: `/api/generate-image`
- 图片保存API: `/api/save-image`

## 🎯 动态问题生成

### 根据用户问题智能生成
现在系统会根据用户的具体问题动态生成相关的问题：

- **面试相关问题**: 公司类型、职业形象、颜色搭配
- **约会相关问题**: 约会场合、气质展现、搭配风格
- **聚会相关问题**: 聚会类型、焦点定位、风格偏好
- **日常相关问题**: 主要活动、生活态度、舒适度偏好

### 示例
- 用户输入: "我明天面试穿什么"
- 生成问题:
  1. "这次面试是什么类型的公司？（科技、金融、传统行业等）"
  2. "您希望展现什么样的职业形象？（专业、创新、亲和等）"
  3. "您更偏向什么颜色搭配？（深色系、浅色系、彩色等）"

## 🚀 实时对话体验

### 改进后的对话流程
1. **用户输入**: 具体需求
2. **AI分析**: 根据用户问题生成3个相关问题
3. **逐个提问**: 一次只问一个问题，模拟真实对话
4. **收集回答**: 逐步收集用户回答
5. **生成提示词**: 基于所有回答生成最终提示词
6. **生图**: 调用SeeDream API生成图片

### 用户体验优化
- ✅ 一次只问一个问题
- ✅ 总共只问3个核心问题
- ✅ 问题与用户需求直接相关
- ✅ 实时对话体验
- ✅ 进度指示器

## 🔧 故障排除

### 常见问题
1. **API连接失败**: 检查网络连接和API Key
2. **响应超时**: 检查API服务器状态
3. **格式错误**: 检查请求参数格式

### 调试方法
1. 查看浏览器控制台日志
2. 使用测试页面验证API连接
3. 检查网络请求状态

现在你可以测试完整的API连接和动态问题生成功能了！🎉
