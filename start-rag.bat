@echo off
chcp 65001 >nul
echo ========================================
echo   启动 RAG 服务 (MiniRAG, port 8000)
echo ========================================
cd /d "%~dp0rag-service"
if not exist "requirements.txt" (
  echo [错误] 找不到 rag-service\requirements.txt，请确认在 profile 根目录双击本脚本。
  pause
  exit /b 1
)
where python >nul 2>&1
if errorlevel 1 (
  echo [错误] 未找到 python，请先安装 Python 并加入 PATH。
  pause
  exit /b 1
)
echo.
echo 正在启动 uvicorn...
echo 启动成功后请勿关闭本窗口。在浏览器可访问: http://localhost:8000/health
echo 若 Next.js 提示 RAG 未启动，可在 profile 根目录运行: node scripts/check-rag.js
echo.
python -m uvicorn main:app --host 0.0.0.0 --port 8000
pause
