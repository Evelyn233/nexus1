# RAG 服务怎么启动（解决「还是没启动」）

「Query my database」提示 **RAG 未返回结果** 且「检查 RAG 状态」显示 **请双击 start-rag.bat 启动** 时，说明 RAG 进程未运行，按下面做即可。

**若出现「RAG 返回 500: Install MiniRAG: pip install minirag-hku」**：说明 RAG 进程在跑，但 **Python 里没装 MiniRAG**，请先做下面的 **第零步**，再启动 RAG。

- **未配置 RAG_API_URL**：按下面「第一步」在 **profile 根目录** 的 `.env.local` 添加 `RAG_API_URL`，**保存后重启 Next.js**（关掉终端再 `npm run dev`）。一般可跳过（next.config.js 已默认 8000）。
- **RAG 未启动**：按下面「第二步」启动 RAG，并**保持窗口不关**。
- **RAG 服务正常**：若仍无结果，可在「增加数据库」里用「粘贴文本」或上传 Word/PDF 添加内容后再查。

---

## 第零步：安装 RAG 依赖（报错 Install MiniRAG 时必做）

在 **profile 根目录** 任选一种方式安装 MiniRAG 等依赖，**只需做一次**。

### 方式 A：双击脚本（推荐）

- 双击 **`install-rag-deps.bat`**。
- 等待安装完成（首次会下载 minirag-hku、transformers、torch 等，可能几分钟）。
- 完成后即可双击 `start-rag.bat` 启动 RAG。

### 方式 B：命令行

在 **profile** 根目录打开终端，执行：

```bash
cd rag-service
pip install -r requirements.txt
```

若 `minirag-hku` 安装失败，可尝试：

```bash
pip install minirag-hku
```

或从 GitHub 安装：

```bash
pip install git+https://github.com/HKUDS/MiniRAG.git
```

安装完成后，**关掉当前 RAG 窗口**（若在运行），再重新双击 `start-rag.bat` 或执行 `python -m uvicorn main:app --host 0.0.0.0 --port 8000`。

---

## 第一步：RAG 地址（通常可跳过）

**RAG 已内置默认**：`next.config.js` 里默认 `RAG_API_URL=http://localhost:8000`，一般**不用**再配。

如需改端口或地址，在 **profile 根目录** 的 **`.env.local`** 里加一行：
```env
RAG_API_URL=http://localhost:8000
```
保存后**重启 Next.js**（Ctrl+C 再 `npm run dev`）。

---

## 第二步：启动 RAG 服务

任选一种方式。

### 方式 A：双击脚本（推荐）

- 在 profile 根目录下双击 **`start-rag.bat`**。
- 会先进入 `rag-service`，再启动 uvicorn。
- 看到类似 `Uvicorn running on http://0.0.0.0:8000` 即表示 RAG 已启动。
- **不要关掉这个窗口**，关掉 RAG 就停了。

### 方式 B：命令行

在 **profile** 根目录打开终端，执行：

```bash
cd rag-service
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

同样看到 `Uvicorn running on http://0.0.0.0:8000` 即表示成功。不要关掉该终端。

---

## 第三步：确认能用

1. RAG 窗口/终端保持运行。
2. 在 profile 根目录运行：`node scripts/check-rag.js`  
   - 若显示「✅ RAG 服务已启动」说明 RAG 正常；若显示「❌ RAG 未启动」请回到第二步。
3. 或浏览器打开：<http://localhost:8000/health>，若返回 `{"status":"ok",...}` 说明 RAG 正常。
4. 回到 Profile 页，再试一次「Query my database」（例如输入「what did evelyn do in 2020」）。  
   - 若 RAG 里已通过「增加数据库」粘贴过相关内容，应能搜到；若仍无结果，可再在「增加数据库」里用「粘贴文本」或上传 Word/PDF 添加内容。

---

## 可选：用 DeepSeek API 减轻本机负担

若在 **profile 根目录** 的 **`.env`** 或 **`rag-service/.env`** 里设置 **`DEEPSEEK_API_KEY`**（你的 DeepSeek API 密钥），RAG 会用 **DeepSeek API** 做「根据检索结果生成答案」这一步，本机**只跑 embedding 模型**（all-MiniLM-L6-v2），不再加载本地 LLM（Phi-3.5），启动和查询都会更轻、更快。

```env
DEEPSEEK_API_KEY=sk-你的密钥
```

启动 RAG 后访问 `http://localhost:8000/health`，若返回 `"llm": "deepseek"` 表示已使用 DeepSeek API。

---

## 常见问题

- **没有 Python / 找不到 uvicorn**  
  在 `rag-service` 目录执行：`pip install -r requirements.txt`，再重新执行第二步。

- **端口 8000 被占用**  
  换端口：`python -m uvicorn main:app --host 0.0.0.0 --port 8001`  
  并把 `.env.local` 改为：`RAG_API_URL=http://localhost:8001`，重启 Next.js。

- **仍然提示 RAG 服务未配置或未启动**  
  确认：① `.env.local` 里有 `RAG_API_URL=http://localhost:8000`；② 已重启 Next.js；③ RAG 窗口/终端没关，且 `http://localhost:8000/health` 能打开。
