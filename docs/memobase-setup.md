# Memobase集成配置说明

## 概述
本项目已集成[Memobase](https://github.com/memodb-io/memobase.git)来增强用户记忆功能，提供基于用户画像的长期记忆系统。

## 配置步骤

### 1. 创建环境变量文件
在项目根目录创建 `.env.local` 文件，添加以下配置：

```bash
# 本地开发环境
NEXT_PUBLIC_MEMOBASE_URL=http://localhost:8019
NEXT_PUBLIC_MEMOBASE_API_KEY=secret

# 生产环境（如果使用Memobase Cloud）
# NEXT_PUBLIC_MEMOBASE_URL=https://api.memobase.dev
# NEXT_PUBLIC_MEMOBASE_API_KEY=sk-proj-xxxxxx
```

### 2. 启动Memobase服务

#### 选项A：本地运行（推荐用于开发）
```bash
# 克隆Memobase仓库
git clone https://github.com/memodb-io/memobase.git
cd memobase

# 使用Docker启动
docker-compose up -d

# 或者使用Python直接运行
pip install -r requirements.txt
python -m memobase.main
```

#### 选项B：使用Memobase Cloud（推荐用于生产）
1. 访问 [memobase.io](https://memobase.io)
2. 注册账户并创建项目
3. 获取项目URL和API密钥
4. 更新环境变量配置

### 3. 验证集成
启动应用后，检查浏览器控制台是否有以下日志：
- `✅ 用户信息已同步到Memobase`
- `✅ 用户元数据已同步到Memobase`
- `✅ 聊天记录已保存到Memobase`

## 功能特性

### 1. 增强的用户记忆
- **用户画像持久化**：自动保存和更新用户性格特征
- **对话历史记录**：保存完整的聊天记录用于上下文理解
- **元数据分析**：深度分析用户MBTI、性格演化等特征

### 2. 智能上下文生成
- **个性化上下文**：基于用户历史生成个性化对话上下文
- **时间感知记忆**：记录用户事件时间线，支持时间相关查询
- **批量处理**：高效的批量数据处理，降低LLM成本

### 3. 数据同步机制
- **双重存储**：本地存储 + Memobase云端存储
- **故障转移**：Memobase不可用时自动回退到本地存储
- **增量更新**：只同步新增或修改的数据

## API使用示例

```typescript
import { memobaseService } from '@/lib/memobaseService'

// 保存用户信息
await saveUserInfoWithMemobase(userInfo)

// 保存用户元数据
await saveUserMetadataWithMemobase(metadata)

// 获取增强的用户上下文
const context = await getEnhancedUserContext()

// 保存聊天记录
await saveChatToMemobase(messages)
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查Memobase服务是否正在运行
   - 验证环境变量配置是否正确
   - 查看浏览器控制台错误信息

2. **数据同步失败**
   - 应用会自动回退到本地存储
   - 检查网络连接
   - 验证API密钥权限

3. **性能问题**
   - Memobase使用批量处理，对性能影响最小
   - 如需要，可以调整`max_token_size`参数

### 调试模式
在浏览器控制台查看详细日志：
```javascript
// 检查Memobase连接状态
memobaseService.checkConnection().then(console.log)
```

## 更多信息
- [Memobase GitHub](https://github.com/memodb-io/memobase.git)
- [Memobase文档](https://memobase.io/docs)
- [Memobase Playground](https://playground.memobase.io)
