"""
MiniRAG API service for profile "database" (增加数据库).
Index text or URL content, then query with natural language.
See: https://github.com/HKUDS/MiniRAG

可选：设置 DEEPSEEK_API_KEY 后，用 DeepSeek API 做「根据检索结果生成答案」，
本机只跑 embedding（all-MiniLM-L6-v2），不再加载本地 LLM，减轻机器负担。
"""
import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Optional: load .env for DEEPSEEK_API_KEY（绝对路径，避免 cwd 影响）
try:
    from dotenv import load_dotenv
    _rag_dir = os.path.dirname(os.path.abspath(__file__))
    _root = os.path.dirname(_rag_dir)
    load_dotenv(os.path.join(_rag_dir, ".env"), override=True)
    load_dotenv(os.path.join(_root, ".env"))
    load_dotenv(os.path.join(_root, ".env.local"))
except Exception:
    pass

# Optional: fetch URL content
try:
    import requests
    from bs4 import BeautifulSoup
    HAS_FETCH = True
except ImportError:
    HAS_FETCH = False

WORKING_DIR = os.environ.get("MINIRAG_WORKING_DIR", "./rag_storage")
os.makedirs(WORKING_DIR, exist_ok=True)

rag = None


def _deepseek_complete(prompt, system_prompt=None, history_messages=None, **kwargs):
    """用 DeepSeek API 生成回答，替代本地 LLM。签名与 MiniRAG 的 llm_model_func 兼容。"""
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY is not set")
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    if history_messages:
        for m in history_messages:
            role = m.get("role", "user") if isinstance(m, dict) else "user"
            content = m.get("content", str(m)) if isinstance(m, dict) else str(m)
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": prompt})
    try:
        r = requests.post(
            "https://api.deepseek.com/chat/completions",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
            json={
                "model": os.environ.get("DEEPSEEK_RAG_MODEL", "deepseek-chat"),
                "messages": messages,
                "max_tokens": kwargs.get("max_tokens", 512),
                "temperature": kwargs.get("temperature", 0.3),
            },
            timeout=60,
        )
        r.raise_for_status()
        data = r.json()
        choice = (data.get("choices") or [{}])[0]
        return (choice.get("message") or {}).get("content", "").strip()
    except requests.RequestException as e:
        raise RuntimeError(f"DeepSeek API error: {e}") from e


def get_rag():
    global rag
    if rag is not None:
        return rag
    try:
        from minirag import MiniRAG, QueryParam
        from minirag.llm.hf import hf_model_complete, hf_embed
        from minirag.utils import EmbeddingFunc
        from transformers import AutoModel, AutoTokenizer
    except ImportError as e:
        raise RuntimeError(
            "Install MiniRAG: pip install minirag-hku (and deps). See https://github.com/HKUDS/MiniRAG"
        ) from e

    EMBEDDING_MODEL = os.environ.get("MINIRAG_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    use_deepseek = bool(os.environ.get("DEEPSEEK_API_KEY", "").strip())

    tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL)
    embed_model = AutoModel.from_pretrained(EMBEDDING_MODEL)

    if use_deepseek:
        llm_func = _deepseek_complete
        llm_name = "deepseek-chat"
    else:
        llm_func = lambda *a, **k: hf_model_complete(*a, **k)
        llm_name = os.environ.get("MINIRAG_LLM", "microsoft/Phi-3.5-mini-instruct")

    rag = MiniRAG(
        working_dir=WORKING_DIR,
        llm_model_func=llm_func,
        llm_model_max_token_size=200,
        llm_model_name=llm_name,
        embedding_func=EmbeddingFunc(
            embedding_dim=384,
            max_token_size=1000,
            func=lambda texts: hf_embed(texts, tokenizer=tokenizer, embed_model=embed_model),
        ),
    )
    return rag


def fetch_url_text(url: str, max_chars: int = 100000) -> str:
    if not HAS_FETCH:
        raise HTTPException(status_code=501, detail="Install requests and beautifulsoup4 for URL indexing")
    try:
        r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0 (compatible; MiniRAG/1.0)"})
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script", "style"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        return text[:max_chars] if text else ""
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}") from e


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时再加载一次 .env，并打印 LLM 模式（便于排查）
    try:
        from dotenv import load_dotenv
        _rag_dir = os.path.dirname(os.path.abspath(__file__))
        _root = os.path.dirname(_rag_dir)
        load_dotenv(os.path.join(_rag_dir, ".env"), override=True)
        load_dotenv(os.path.join(_root, ".env"))
        load_dotenv(os.path.join(_root, ".env.local"))
    except Exception:
        pass
    key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    print(f"[RAG] LLM: {'deepseek' if key else 'local'} (DEEPSEEK_API_KEY: {'set' if key else 'not set'})")
    yield
    pass


app = FastAPI(title="MiniRAG API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IndexTextBody(BaseModel):
    text: str


class IndexUrlBody(BaseModel):
    url: str


class QueryBody(BaseModel):
    query: str


@app.post("/index")
def index_text(body: IndexTextBody):
    """Index raw text into MiniRAG (for profile database)."""
    if not body.text or not body.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    try:
        get_rag().insert(body.text.strip())
        return {"ok": True, "message": "Indexed successfully"}
    except Exception as e:
        print("[RAG] /index 500:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/index-url")
def index_url(body: IndexUrlBody):
    """Fetch URL content and index into MiniRAG (e.g. LinkedIn, Notion, personal page)."""
    text = fetch_url_text(body.url)
    if not text:
        raise HTTPException(status_code=400, detail="No text content from URL")
    try:
        get_rag().insert(text)
        return {"ok": True, "message": "URL content indexed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/query")
def query_rag(body: QueryBody):
    """Query the RAG database (used when 'Query my database' has no local matches)."""
    if not body.query or not body.query.strip():
        raise HTTPException(status_code=400, detail="query is required")
    try:
        from minirag import QueryParam
        answer = get_rag().query(body.query.strip(), param=QueryParam(mode="mini"))
        return {"ok": True, "answer": (answer or "").replace("\n", " ").replace("\r", "")}
    except Exception as e:
        print("[RAG] /query 500:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/health")
def health():
    return {
        "status": "ok",
        "working_dir": WORKING_DIR,
        "llm": "deepseek" if os.environ.get("DEEPSEEK_API_KEY", "").strip() else "local",
    }


@app.get("/stats")
def stats():
    """Return number of indexed (processed) documents so the frontend can show 'index empty' vs 'no match'."""
    try:
        import asyncio
        from minirag.base import DocStatus
        r = get_rag()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            docs = loop.run_until_complete(r.doc_status.get_docs_by_status(DocStatus.PROCESSED))
            return {"ok": True, "processed_count": len(docs) if docs else 0}
        finally:
            loop.close()
    except Exception as e:
        return {"ok": False, "processed_count": 0, "error": str(e)}
