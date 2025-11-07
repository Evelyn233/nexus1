# Gallery 图片加载问题排查指南

## 🔍 问题症状

**现象**: Gallery 页面显示"暂无保存的图片"

```
┌─────────────────────┐
│  🖼️                  │
│  暂无图片            │
│  开始创作后，你的    │
│  所有图片都会显示    │
│  在这里              │
│  [开始创作]          │
└─────────────────────┘
```

## 📊 可能的原因

### 1. 还没有生成过内容 ✅ 最常见

**检查方法**:
- 打开浏览器控制台（F12）
- 查看日志输出：`🖼️ [GALLERY] 没有生成内容记录`

**解决方案**:
1. 点击"开始创作"按钮
2. 在主页输入你的想法
3. 完成创作流程
4. 返回 Gallery 页面查看

### 2. 数据库中 images 字段为空

**检查方法**:
控制台日志显示：
```
🖼️ [GALLERY] 处理内容 1/5:
  id: "xxx"
  hasImages: false
  imageCount: 0
```

**原因**:
- 创作内容保存时没有正确存储图片数据
- `images` 字段为 null 或空数组

**解决方案**:
检查 `app/chat-new/page.tsx` 中的保存逻辑：
```typescript
// 确保 generatedImagesData 被正确收集
await fetch('/api/user/generated-content', {
  method: 'POST',
  body: JSON.stringify({
    images: generatedImagesData,  // 确保这里有数据
    imageCount: generatedImagesData.length
  })
})
```

### 3. 图片 URL 缺失

**检查方法**:
控制台日志显示：
```
🖼️ [GALLERY] 图片 0 缺少 imageUrl
```

**原因**:
- 图片生成失败
- imageUrl 字段为空

**解决方案**:
检查图片生成 API 是否正常工作

### 4. JSON 解析失败

**检查方法**:
控制台显示错误：
```
🖼️ [GALLERY] 解析图片失败: SyntaxError: Unexpected token
```

**原因**:
- `images` 字段不是有效的 JSON 格式

**解决方案**:
检查数据库中的 `images` 字段格式

### 5. API 请求失败

**检查方法**:
控制台显示：
```
🖼️ [GALLERY] API请求失败: 401 Unauthorized
或
🖼️ [GALLERY] API返回失败: 未登录
```

**原因**:
- 用户未登录
- Session 过期

**解决方案**:
- 重新登录
- 刷新页面

## 🛠️ 调试步骤

### 第1步：打开浏览器控制台

1. 按 F12 打开开发者工具
2. 切换到 "Console" 标签
3. 刷新 Gallery 页面

### 第2步：查看日志输出

查找以下关键日志：

#### ✅ 正常情况
```
🖼️ [GALLERY] 开始加载图片...
🖼️ [GALLERY] API返回: {success: true, contentsLength: 5, total: 5}
🖼️ [GALLERY] 处理内容 1/5: {id: "xxx", hasImages: true, imageCount: 11}
🖼️ [GALLERY] 解析图片成功，数量: 11
🖼️ [GALLERY] 提取的图片数量: 55
🖼️ [GALLERY] 图片列表预览: [{...}, {...}, {...}]
```

#### ❌ 异常情况示例

**情况1: 没有内容记录**
```
🖼️ [GALLERY] API返回: {success: true, contentsLength: 0, total: 0}
🖼️ [GALLERY] 没有生成内容记录
```
**解决**: 先去生成一些内容

**情况2: 有内容但没有图片**
```
🖼️ [GALLERY] 处理内容 1/3: {id: "xxx", hasImages: false, imageCount: 0}
🖼️ [GALLERY] 内容 xxx 没有图片数据
🖼️ [GALLERY] 提取的图片数量: 0
```
**解决**: 检查内容保存逻辑

**情况3: 解析错误**
```
🖼️ [GALLERY] 解析图片失败: SyntaxError...
```
**解决**: 检查数据库 images 字段格式

### 第3步：检查数据库

如果有数据库访问权限，直接查询：

```sql
-- 查看用户的生成内容
SELECT id, "initialPrompt", "imageCount", images, "createdAt"
FROM user_generated_contents
WHERE "userId" = 'YOUR_USER_ID'
ORDER BY "createdAt" DESC
LIMIT 10;
```

**检查点**:
- ✅ `imageCount` 大于 0
- ✅ `images` 字段不为 null
- ✅ `images` 是有效的 JSON 数组
- ✅ 数组中每个对象都有 `imageUrl` 字段

### 第4步：检查网络请求

1. 打开 "Network" 标签
2. 刷新页面
3. 查找 `user/generated-content` 请求
4. 检查响应内容

**正常响应示例**:
```json
{
  "success": true,
  "contents": [
    {
      "id": "xxx",
      "initialPrompt": "我觉得自己像个反社会女反派",
      "imageCount": 11,
      "images": "[{\"imageUrl\":\"https://...\",\"sceneTitle\":\"场景1\",...}]",
      "createdAt": "2025-10-31T05:00:00.000Z"
    }
  ],
  "total": 5
}
```

## 💡 常见解决方案

### 方案1: 重新生成内容

如果数据库是空的，最简单的方法就是生成新内容：

1. 点击 Gallery 页面的"开始创作"按钮
2. 或访问 `/home` 页面
3. 输入任意内容，例如：
   - "今天上班很开心"
   - "我觉得自己像个反社会女反派"
   - "如果我当年没有出国"
4. 完成问答流程
5. 等待图片生成完成
6. 返回 Gallery 页面

### 方案2: 检查登录状态

如果看到 401 错误：

1. 检查是否已登录
2. 查看页面右上角是否显示用户信息
3. 如果未登录，点击登录按钮
4. 登录成功后刷新 Gallery 页面

### 方案3: 清除缓存

有时浏览器缓存会导致问题：

1. 按 Ctrl+Shift+R (Windows) 或 Cmd+Shift+R (Mac) 强制刷新
2. 或清除浏览器缓存后重新访问

### 方案4: 检查 API 权限

确保 `/api/user/generated-content` 端点正常工作：

1. 打开 `http://localhost:3000/api/user/generated-content?limit=5&offset=0`
2. 应该返回 JSON 数据或重定向到登录页面
3. 如果返回 500 错误，检查后端日志

## 🔧 开发者调试

### 添加测试数据

如果需要测试，可以手动添加一条记录：

```typescript
// 在 chat-new 页面保存后的回调中添加日志
console.log('💾 保存的图片数据:', generatedImagesData)

// 确保数据格式正确
generatedImagesData.forEach((img, i) => {
  console.log(`图片 ${i}:`, {
    hasImageUrl: !!img.imageUrl,
    hasStory: !!img.story,
    hasSceneTitle: !!img.sceneTitle
  })
})
```

### 检查图片数据格式

正确的图片数据格式：

```typescript
[
  {
    imageUrl: "https://ark-content-generation-v2-cn-beijing.tos-cn-beijing.volces.com/...",
    story: "场景描述文字...",
    sceneTitle: "场景1",
    sceneIndex: 0,
    prompt: "场景描述..."
  },
  // ... 更多图片
]
```

### 模拟数据测试

可以临时修改 Gallery 页面，添加测试数据：

```typescript
// 在 loadSavedImages 函数开始处添加
const mockImages = [
  {
    id: 'test-1',
    imageUrl: 'https://via.placeholder.com/400',
    prompt: '测试图片',
    story: '这是测试故事',
    sceneTitle: '测试场景',
    contentId: 'test',
    savedAt: new Date().toISOString()
  }
]
setSavedImages(mockImages)
setLoading(false)
return
```

## 📝 数据流检查清单

- [ ] 用户已登录
- [ ] Session 有效
- [ ] 数据库中有 `UserGeneratedContent` 记录
- [ ] 记录的 `imageCount` > 0
- [ ] 记录的 `images` 字段不为 null
- [ ] `images` 字段是有效的 JSON 数组
- [ ] 数组中的对象包含 `imageUrl` 字段
- [ ] `imageUrl` 是有效的 URL
- [ ] API `/api/user/generated-content` 正常返回
- [ ] 浏览器控制台没有错误

## 🎯 快速诊断命令

在浏览器控制台运行：

```javascript
// 手动调用 API 检查数据
fetch('/api/user/generated-content?limit=5&offset=0')
  .then(r => r.json())
  .then(data => {
    console.log('API 响应:', data)
    if (data.contents) {
      console.log('内容数量:', data.contents.length)
      data.contents.forEach((c, i) => {
        const images = typeof c.images === 'string' ? JSON.parse(c.images) : c.images
        console.log(`内容 ${i+1}:`, {
          id: c.id,
          imageCount: c.imageCount,
          actualImages: images?.length || 0,
          hasUrls: images?.every(img => img.imageUrl)
        })
      })
    }
  })
```

## 📞 仍然无法解决？

如果以上步骤都无法解决问题，请提供以下信息：

1. **浏览器控制台完整日志** (从 `🖼️ [GALLERY] 开始加载图片...` 开始的所有日志)
2. **Network 标签中 `generated-content` 请求的响应**
3. **是否已经生成过内容** (去 Profile 页面查看"创作次数"是否 > 0)
4. **错误截图** (如果有报错)

---

**更新时间**: 2025-10-31  
**相关文件**:
- `app/gallery/page.tsx` - Gallery 页面
- `app/api/user/generated-content/route.ts` - 内容 API
- `app/chat-new/page.tsx` - 内容生成页面



