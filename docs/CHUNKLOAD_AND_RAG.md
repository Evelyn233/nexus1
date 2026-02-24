# ChunkLoadError 修复 + 增加数据库与轻量 RAG 说明

## 1. ChunkLoadError: Loading chunk app/layout failed (timeout)

**原因**：Next.js 的 webpack  chunk 加载超时或缓存异常（例如 dev 重启、网络慢、.next 损坏）。

**修复步骤**：

1. 停掉 dev server（Ctrl+C）。
2. 删除构建缓存后重启：
   ```bash
   cd c:\Users\Evelyn\Desktop\rag\profile
   rmdir /s /q .next
   npm run dev
   ```
3. 浏览器硬刷新（Ctrl+Shift+R）或关掉该页重新打开 `http://localhost:3000`。

若仍报错，可再试：清空浏览器缓存、换网络/关 VPN、或暂时禁用浏览器扩展后再打开页面。

---

## 2. “增加数据库”里 LinkedIn 等是否加入数据库？

**当前实现**：  
右上角三点 → 「增加数据库」里添加的 **Word / LinkedIn / 个人网页 / Notion / PDF / Google 文档** 等，**只存了「链接」**，没有抓取或索引内容。

- **存到哪里**：`profileData.databaseSources`（后端 `/api/user/save`）和本地 `livingProfile.home.v1`（localStorage）。
- **存的内容**：`{ id, type, url, title? }`，例如 `{ type: 'linkedin', url: 'https://linkedin.com/in/...' }`。
- **没有做的**：没有爬取 URL 内容、没有分块、没有做 embedding、没有向量库，所以 **「Query my database」目前只能搜你已存的标签/洞察/Q&A 文本**，不会去搜 LinkedIn 页面内容。

结论：**LinkedIn 等是“加入数据库链接列表”，不是“加入可被 RAG 检索的数据库”**。要真正用这些链接做检索，需要再接一层轻量 RAG（见下）。

---

## 3. 轻量 RAG 方案（可选后续接入）

下面这些可以后续用来把「增加数据库」里的 URL/文件变成可检索的 RAG 数据源。

| 方案 | 类型 | 说明 |
|------|------|------|
| **@llm-tools/embedjs** | npm (Node.js) | 文档分块、embedding、向量库一体，TypeScript，适合在 API 里做 RAG。 |
| **@forge-ml/rag** | npm | 文档分块 + OpenAI/Nomic embedding + Redis 向量存储，API 简单。 |
| **Recall.js** | GitHub | JS 长时记忆/RAG，偏轻量。 |
| **LightRAG** | Python (GitHub: HKUDS/LightRAG) | 图结构 + 双级检索，需要 Python 服务或单独跑。 |
| **MiniRAG** | 论文/研究 | 极简、省存储，多与 SLM 搭配，暂无现成 npm。 |

**建议**：  
- 若坚持 **全在 Next.js/Node 里**：优先试 **@llm-tools/embedjs** 或 **@forge-ml/rag**，在 API 里对 `databaseSources` 的 URL 做抓取 → 分块 → 存向量 → 查询时检索。  
- 若可接受 **单独服务**：可用 Python 的 **LightRAG** 建索引与检索服务，Next.js 只调其 API。

当前项目里「增加数据库」只负责把链接存进用户数据；真正「对 LinkedIn 等提问」需要再接上述任一 RAG 管线。
