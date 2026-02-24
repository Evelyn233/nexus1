# MiniRAG Service (Profile "增加数据库")

Python FastAPI service that powers the profile **Query my database** and **增加数据库** features using [MiniRAG](https://github.com/HKUDS/MiniRAG) (HKUDS).

## What it does

- **POST /index** — Index raw text into the RAG knowledge base.
- **POST /index-url** — Fetch a URL (e.g. LinkedIn, Notion, personal page), extract text, and index it.
- **POST /query** — Run a natural-language query and return an answer from the indexed content.
- **GET /health** — Service health check.

## Setup

1. **Python 3.10+** and a virtualenv recommended.

2. **Install dependencies** (from the **profile** repo root, first go into `rag-service`):

   ```bash
   cd rag-service
   pip install -r requirements.txt
   ```
   Or from anywhere: `pip install -r path/to/profile/rag-service/requirements.txt`

   The `minirag-hku` package may pull in `transformers`, `torch`, etc. For URL indexing you need `requests` and `beautifulsoup4` (included in requirements).

3. **Optional environment variables:**

   | Variable | Default | Description |
   |----------|---------|-------------|
   | `MINIRAG_WORKING_DIR` | `./rag_storage` | Directory for MiniRAG index storage. |
   | `MINIRAG_EMBED_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | HuggingFace embedding model (always runs locally). |
   | `MINIRAG_LLM` | `microsoft/Phi-3.5-mini-instruct` | LLM used when **not** using DeepSeek (local model). |
   | **`DEEPSEEK_API_KEY`** | *(none)* | **若设置**：用 DeepSeek API 做「根据检索结果生成答案」，本机只跑 embedding，不加载本地 LLM，减轻负担。可在 profile 根目录 `.env` 或 `rag-service/.env` 中设置。 |
   | `DEEPSEEK_RAG_MODEL` | `deepseek-chat` | DeepSeek 模型名（仅在设置了 `DEEPSEEK_API_KEY` 时生效）。 |

4. **Run the service:**

   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

   The API will be at `http://localhost:8000`. First request may be slow (embedding model download/load). If `DEEPSEEK_API_KEY` is set, only the embedding model runs locally; answer generation uses DeepSeek API.

## Next.js integration

In the profile app, set:

```env
RAG_API_URL=http://localhost:8000
```

- **增加数据库**: When the user adds a source by URL and clicks 添加, the app calls `POST /api/rag/index-url`, which proxies to this service to fetch and index the URL.
- **Query my database**: The app first searches local data (tags, insights, Q&A). If there are no matches, it calls `POST /api/rag/query`; the answer is shown as "From RAG: …".

See `profile/docs/MINIRAG_INTEGRATION.md` for full integration details.
