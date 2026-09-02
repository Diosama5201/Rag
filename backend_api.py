"""
FastAPI 后端接口：对 RagService / VectorStoreService / KnowledgeBaseService 做薄包装。
不修改 rag.py / knowledge_base.py / vector_stores.py，仅在此层暴露 HTTP 接口。

启动：
    python backend_api.py
    或 uvicorn backend_api:app --host 127.0.0.1 --port 8000

接口：
    POST /api/chat         非流式问答
    POST /api/chat_stream  流式问答（SSE）
    POST /api/upload       上传 txt 文件入知识库
    POST /api/search       向量检索（调试用）
"""
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from rag import RagService
from knowledge_base import KnowledgeBaseService
from vector_stores import VectorStoreService
from langchain_community.embeddings import DashScopeEmbeddings
import config_data as config
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI(title="RAG知识库后端接口")

# 全局单例：Chroma client 等开销较大，启动时初始化一次，后续请求复用
rag_service = RagService()
kb_service = KnowledgeBaseService()
vector_service = VectorStoreService(embedding=DashScopeEmbeddings(model=config.embedding_model_name))
# 允许所有来源的请求
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    input: str               # 用户提问
    session_id: str = "default"   # 会话id，区分不同用户聊天历史


@app.post("/api/chat")
def chat(req: ChatRequest):
    """问答接口，非流式，一次性返回完整回答。
    chain 末尾是 StrOutputParser，invoke 直接返回字符串。
    """
    resp = rag_service.chain.invoke(
        {"input": req.input},
        config={"configurable": {"session_id": req.session_id}}
    )
    return {"answer": resp}


@app.post("/api/chat_stream")
def chat_stream(req: ChatRequest):
    """流式输出接口（SSE）。chain.stream 产出的是字符串 chunk。"""
    def generator():
        for chunk in rag_service.chain.stream(
            {"input": req.input},
            config={"configurable": {"session_id": req.session_id}}
        ):
            yield f"data:{chunk}\n\n"
    return StreamingResponse(generator(), media_type="text/event-stream")


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    """上传 txt 文件，解析后写入向量知识库。"""
    content = await file.read()
    text = content.decode("utf-8")
    result = kb_service.upload_by_str(text, file.filename)
    return {"message": result}


@app.post("/api/search")
def search(req: ChatRequest):
    """向量检索接口（调试用），返回 top_k 相关文档片段。"""
    retriever = vector_service.get_retriever()
    docs = retriever.invoke(req.input)
    return {
        "docs": [
            {"content": d.page_content, "metadata": d.metadata}
            for d in docs
        ]
    }


if __name__ == "__main__":
    import uvicorn
    # 启动后端服务，地址 http://127.0.0.1:8000
    uvicorn.run(app, host="127.0.0.1", port=8000)
