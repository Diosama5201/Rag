import os

md5_path = 'md5.text'
#chroma 数据库路径
collection_name = "rag"
#chroma 数据库持久化目录
persist_directory = "./chroma_db"
# spliter
chunk_size = 1000
chunk_overlap = 100
separators = ["\n\n", "\n", "。", "！", "?"]
max_spliter_char_number = 1000 
# 检索访问匹配的文档数量
top_k = 4 
#文本转向量模型名字        
embedding_model_name = "text-embedding-v2"
# 聊天模型名字
chat_model_name = "gpt-4o-mini"
# ==========OpenAI配置==========
openai_api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
openai_api_key=os.getenv("DASHSCOPE_API_KEY")
# session id 配置
session_config = {
        "configurable":{
            "session_id": "user_01",
        }
    }