// Memobase服务 - 用于增强用户记忆功能
import { UserInfo, UserMetadata } from './userInfoService'

// Memobase客户端配置
interface MemobaseConfig {
  projectUrl: string
  apiKey: string
}

// 聊天消息接口
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

// Memobase用户接口
interface MemobaseUser {
  uid: string
  profile: any
  insert: (blob: any) => Promise<string>
  flush: (sync?: boolean) => Promise<void>
  get: (bid: string) => any
  delete: (bid: string) => void
  context: (options?: any) => Promise<string>
}

// Memobase客户端
class MemobaseClient {
  private config: MemobaseConfig
  private users: Map<string, MemobaseUser> = new Map()

  constructor(config: MemobaseConfig) {
    this.config = config
  }

  // 检查连接状态
  async ping(): Promise<boolean> {
    try {
      // 如果配置为默认值，直接返回false，避免不必要的网络请求
      if (this.config.projectUrl === 'http://localhost:8019' && this.config.apiKey === 'secret') {
        console.log('⚠️ Memobase使用默认配置，跳过连接检查')
        return false
      }
      
      const response = await fetch(`${this.config.projectUrl}/ping`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      })
      return response.ok
    } catch (error) {
      console.log('⚠️ Memobase服务不可用，将使用本地存储')
      return false
    }
  }

  // 添加或获取用户
  async getUser(userId: string, userInfo?: UserInfo): Promise<MemobaseUser> {
    if (this.users.has(userId)) {
      return this.users.get(userId)!
    }

    try {
      // 构建用户数据
      const userData = {
        id: userId,
        name: userInfo?.name || '用户',
        gender: userInfo?.gender || '',
        age: userInfo?.age || 0,
        location: userInfo?.location || '',
        personality: userInfo?.personality || '',
        birthDate: userInfo?.birthDate || {},
        physical: {
          height: userInfo?.height || '',
          weight: userInfo?.weight || ''
        },
        created_at: new Date().toISOString()
      }

      // 添加用户到Memobase
      const response = await fetch(`${this.config.projectUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(userData)
      })

      if (!response.ok) {
        throw new Error(`Failed to add user: ${response.status}`)
      }

      const result = await response.json()
      const user: MemobaseUser = {
        uid: result.uid,
        profile: result.profile || {},
        insert: async (blob: any) => await this.insertBlob(result.uid, blob),
        flush: (sync = true) => this.flushUser(result.uid, sync),
        get: (bid: string) => this.getBlob(result.uid, bid),
        delete: (bid: string) => this.deleteBlob(result.uid, bid),
        context: (options = {}) => this.getContext(result.uid, options)
      }

      this.users.set(userId, user)
      return user
    } catch (error) {
      console.error('Failed to get user from Memobase:', error)
      // 返回一个模拟的用户对象
      return this.createMockUser(userId)
    }
  }

  // 插入聊天数据
  async insertChat(userId: string, messages: ChatMessage[]): Promise<string> {
    try {
      const user = await this.getUser(userId)
      const chatBlob = {
        type: 'chat',
        messages: messages,
        timestamp: new Date().toISOString()
      }
      return user.insert(chatBlob)
    } catch (error) {
      console.error('Failed to insert chat:', error)
      return ''
    }
  }

  // 插入用户元数据
  async insertMetadata(userId: string, metadata: UserMetadata): Promise<string> {
    try {
      const user = await this.getUser(userId)
      const metadataBlob = {
        type: 'metadata',
        metadata: metadata,
        timestamp: new Date().toISOString()
      }
      return user.insert(metadataBlob)
    } catch (error) {
      console.error('Failed to insert metadata:', error)
      return ''
    }
  }

  // 获取用户上下文
  async getUserContext(userId: string, maxTokens: number = 1000): Promise<string> {
    try {
      const user = await this.getUser(userId)
      await user.flush(true) // 同步刷新以确保数据最新
      return user.context({ max_token_size: maxTokens })
    } catch (error) {
      console.error('Failed to get user context:', error)
      return ''
    }
  }

  // 获取用户画像
  async getUserProfile(userId: string): Promise<any> {
    try {
      const user = await this.getUser(userId)
      await user.flush(true)
      return user.profile
    } catch (error) {
      console.error('Failed to get user profile:', error)
      return {}
    }
  }

  // 私有方法：插入blob
  private async insertBlob(uid: string, blob: any): Promise<string> {
    const response = await fetch(`${this.config.projectUrl}/users/${uid}/blobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(blob)
    })

    if (!response.ok) {
      throw new Error(`Failed to insert blob: ${response.status}`)
    }

    const result = await response.json()
    return result.bid
  }

  // 私有方法：刷新用户数据
  private async flushUser(uid: string, sync: boolean = true): Promise<void> {
    const response = await fetch(`${this.config.projectUrl}/users/${uid}/flush`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({ sync })
    })

    if (!response.ok) {
      throw new Error(`Failed to flush user: ${response.status}`)
    }
  }

  // 私有方法：获取blob
  private async getBlob(uid: string, bid: string): Promise<any> {
    const response = await fetch(`${this.config.projectUrl}/users/${uid}/blobs/${bid}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  }

  // 私有方法：删除blob
  private async deleteBlob(uid: string, bid: string): Promise<void> {
    await fetch(`${this.config.projectUrl}/users/${uid}/blobs/${bid}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    })
  }

  // 私有方法：获取上下文
  private async getContext(uid: string, options: any): Promise<string> {
    const response = await fetch(`${this.config.projectUrl}/users/${uid}/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(options)
    })

    if (!response.ok) {
      return ''
    }

    const result = await response.json()
    return result.context || ''
  }

  // 创建模拟用户（当Memobase不可用时）
  private createMockUser(userId: string): MemobaseUser {
    return {
      uid: userId,
      profile: {},
      insert: async () => 'mock-bid-' + Date.now(),
      flush: async () => {},
      get: () => null,
      delete: () => {},
      context: async () => ''
    }
  }
}

// 创建Memobase客户端实例
const createMemobaseClient = (): MemobaseClient => {
  // 优先使用环境变量，否则使用默认配置
  const config: MemobaseConfig = {
    projectUrl: process.env.NEXT_PUBLIC_MEMOBASE_URL || 'http://localhost:8019',
    apiKey: process.env.NEXT_PUBLIC_MEMOBASE_API_KEY || 'secret'
  }
  
  return new MemobaseClient(config)
}

// 导出服务
export const memobaseService = {
  client: createMemobaseClient(),
  
  // 初始化用户
  async initUser(userId: string, userInfo: UserInfo): Promise<MemobaseUser> {
    return await this.client.getUser(userId, userInfo)
  },
  
  // 保存聊天记录
  async saveChat(userId: string, messages: ChatMessage[]): Promise<void> {
    const bid = await this.client.insertChat(userId, messages)
    if (bid) {
      console.log('✅ 聊天记录已保存到Memobase:', bid)
    }
  },
  
  // 保存用户元数据
  async saveMetadata(userId: string, metadata: UserMetadata): Promise<void> {
    const bid = await this.client.insertMetadata(userId, metadata)
    if (bid) {
      console.log('✅ 用户元数据已保存到Memobase:', bid)
    }
  },
  
  // 获取用户上下文
  async getUserContext(userId: string, maxTokens: number = 1000): Promise<string> {
    return await this.client.getUserContext(userId, maxTokens)
  },
  
  // 获取用户画像
  async getUserProfile(userId: string): Promise<any> {
    return await this.client.getUserProfile(userId)
  },
  
  // 检查连接状态
  async checkConnection(): Promise<boolean> {
    return await this.client.ping()
  }
}

export default memobaseService
