<div align="center">

# 🎮 英雄联盟 RAG 智能知识库

**基于 LangChain + Chroma + 通义千问的检索增强生成（RAG）问答系统**

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![LangChain](https://img.shields.io/badge/🦜%20LangChain-RAG-green?style=flat-square)](https://www.langchain.com/)
[![ChromaDB](https://img.shields.io/badge/VectorDB-Chroma-FF6136?style=flat-square)](https://www.trychroma.com/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Streamlit](https://img.shields.io/badge/UI-Streamlit-FF4B4B?style=flat-square&logo=streamlit&logoColor=white)](https://streamlit.io/)
[![DashScope](https://img.shields.io/badge/LLM-Qwen3--Max-6F42C1?style=flat-square)](https://dashscope.aliyun.com/)

*把英雄联盟攻略文档"喂"给 AI，让它成为你的专属峡谷军师* ⚔️

</div>

---

## 📖 项目简介

本项目是一个完整的 **RAG（Retrieval-Augmented Generation，检索增强生成）** 实战项目。以《英雄联盟》攻略文档为知识库语料，实现了从 **文档入库 → 向量检索 → 大模型问答** 的全链路，并提供了 **三种使用形态**：

| 形态 | 入口 | 适合场景 |
|------|------|----------|
| 🖥️ 赛博朋克风格 Web 前端 | `chat.html` + `backend_api.py` | 日常使用 / 演示，支持流式打字机效果 |
| 🔌 FastAPI 后端接口 | `backend_api.py` | 二次开发 / 对接任意前端 |
| 📦 Streamlit 双应用 | `app_file_uploader.py` / `app_qa.py` | 快速上传语料 / 轻量问答 |

## ✨ 核心功能

- 📤 **文档入库**：上传 TXT 文档，自动切片（chunk 1000 / overlap 100）并向量化存入 Chroma
- 🔁 **MD5 去重**：相同内容重复上传自动跳过，避免知识库冗余
- 🔍 **向量检索**：基于 DashScope `text-embedding-v2`（1024 维）的相似度检索，Top-K 可配置
- 💬 **多轮对话**：基于 `RunnableWithMessageHistory` 的会话记忆，按 `session_id` 隔离聊天历史
- ⚡ **流式输出**：SSE（Server-Sent Events）逐字推送，打字机般的回答体验
- 🌐 **多端支持**：纯 HTML 赛博朋克前端 + Streamlit 界面 + RESTful API 三选一

## 🏗️ 项目结构

```text
PythonProject/ ├── 🧠 核心业务层 │ ├── rag.py # RagService：RAG 问答链（检索→提示词→LLM→解析） │ ├── knowledge_base.py # KnowledgeBaseService：文档入库、MD5 去重、切片 │ ├── vector_stores.py # VectorStoreService：Chroma 向量库封装与检索 │ ├── file_history_store.py # 基于文件的聊天历史存储（会话隔离） │ └── config_data.py # 全局配置：模型名、API Key、切片参数、Top-K │ ├── 🔌 接口与界面层 │ ├── backend_api.py # FastAPI 后端：问答/流式/上传/检索 4 个接口 │ ├── chat.html # 赛博朋克风格 Web 前端（纯 HTML/CSS/JS） │ ├── app_file_uploader.py # Streamlit 文档上传应用 │ └── app_qa.py # Streamlit 知识库问答应用 │ ├── 📚 数据与存储 │ ├── Data/ # 知识库语料（英雄联盟攻略 TXT） │ │ ├── 装备出装指南.txt │ │ ├── 符文选择搭配.txt │ │ ├── 野区与地图机制.txt │ │ └── lol_arena_kb/ # 斗魂竞技场 / 大乱斗专题（6 篇） │ ├── chroma_db/ # Chroma 向量数据库（持久化） │ ├── chat_history/ # 各会话聊天记录 │ └── md5.text # 已入库文档 MD5 指纹（去重） │ └── main.py # 入口占位

## 🔄 工作原理

```text
──────────────┐ ┌───────────────┐ ┌──────────────────┐ │ TXT 文档上传 │──▶│ 切片 + 向量化 │──▶ │ Chroma 持久化 │ │ (MD5 去重) │ │ (embedding-v2) │ │ (chroma_db/) │ └──────────────┘ └───────────────┘ └────────┬─────────┘ │ Top-K 相似度检索 ┌──────────────┐ ┌───────────────┐ ┌────────▼─────────┐ │ 流式回答 SSE │ ◀──│ Qwen3-Max │ ◀── │ 组装增强 Prompt │ │ (打字机效果) │ │ (兼容模式) │ │ (历史+检索上下文) │ └──────────────┘ └───────────────┘ └──────────────────┘

## 🛠️ 技术栈

| 分类 | 技术 | 说明 |
|------|------|------|
| 🦜 编排框架 | LangChain | LCEL 链式编排、RunnableWithMessageHistory 会话记忆 |
| 🗃️ 向量数据库 | ChromaDB | 本地持久化存储，HNSW 索引 |
| 🧮 Embedding | DashScope `text-embedding-v2` | 阿里云通义文本向量模型（1024 维） |
| 🤖 大语言模型 | Qwen3-Max | 通过 OpenAI 兼容模式接入 DashScope |
| ⚙️ 后端框架 | FastAPI + Uvicorn | 高性能异步 API，自动生成 Swagger 文档 |
| 📊 快速原型 | Streamlit | 数据上传与问答的轻量级界面 |
| 🎨 前端 | 原生 HTML / CSS / JS | 赛博朋克风格 UI，SSE 流式渲染 |
| 🐍 运行环境 | Python 3.11 | — |

## 🚀 快速开始

### 1️⃣ 安装依赖

```bash
http://localhost:5500/chat.html这个命令在哪输入
08月25日 17:04
思考过程
思考
这不是一个“命令”，而是一个网址（URL）。你不需要在终端里运行它，只需要在浏览器（比如 Chrome、Edge）的地址栏里输入即可。

具体步骤：
确保后端服务正在运行（非常重要！如果没有运行，前端页面能打开但发消息会报错）。

查看你的终端窗口，是否有一个窗口显示着 Uvicorn running on http://127.0.0.1:8000 。
如果没有，需要先在终端执行：& D:/Python311/python.exe d:/PythonProject/backend_api.py。
打开浏览器（Chrome、Edge 或 Firefox 均可）。

在地址栏输入 http://localhost:5500/chat.html 然后按回车键。

💡 刚才我已经帮你用 IDE 的内置浏览器打开了这个页面，如果你没看到那个预览窗口，可以找一下 IDE 底部或侧边的“预览”面板，或者直接按照上面的步骤在你自己的浏览器里打开。

D:/Python311/python.exe -m http.server 5500你让我起的这个静态服务器怎么起
08月25日 17:06
思考过程
思考
你只需要在终端（命令行）里运行它即可。由于你用的是 Windows，我给你详细的分步指令：

1. 打开终端
在你的电脑上打开一个终端程序：

你可以按 Win + R 键，输入 cmd 然后按回车（这会打开命令提示符）。
或者在 VS Code 里，点击顶部菜单的 终端 -> 新建终端 (Terminal -> New Terminal)。
2. 切换到项目目录
在终端里输入以下命令并按回车（这步很重要，目的是让服务器知道去哪里找你的 chat.html 文件）：

Bash



运行
cd /d d:\PythonProject
3. 启动服务器
现在，在同一个终端窗口里，复制并粘贴下面这行命令，然后按回车键：

Bash



运行
D:/Python311/python.exe -m http.server 5500
你会看到终端里显示一行类似 Serving HTTP on ... 的信息，这说明服务器已经成功启动了。

4. 保持运行
非常重要： 不要关闭这个终端窗口，也不要在这个窗口里输入任何新命令。这个窗口现在变成了你的服务器，关掉它，前端页面就打不开了。

5. 访问页面
现在，打开你的浏览器（Chrome, Edge 等），在地址栏里输入： http://localhost:5500/chat.html 然后按回车，你的赛博朋克知识库前端页面就会出现在浏览器里了！

SyntaxError: Unexpected identifier 'navigator'
08月25日 17:11
已读取 1 个文件，搜索 1 次文件
思考
已读取
chat.html
找到 2 行
navigator
未找到结果
思考
找到问题了！chat.html 里第 855 行有一段中文文本被意外插入到了 JavaScript 代码中间，导致 JS 语法解析失败。

已读取 1 个文件
已读取
chat.html
定位到了！第 855 行被插入了一段中文文字：

JavaScript



// 当前（错误的）：
if (navigator.clipboard &&  然后浏览器访问 `http://localhost:5500/chat.html`navigator.clipboard.writeText) {

// 应该是：
if (navigator.clipboard && navigator.clipboard.writeText) {
这段 然后浏览器访问 http://localhost:5500/chat.html`` 是之前对话中的文本，不知怎么被粘贴/插入到了 HTML 文件里，直接把 JS 语法搞坏了。浏览器解析到 navigator 时发现前面有非法文本，就报 Unexpected identifier 'navigator'。

修复很简单，把那段多余的中文删掉即可：

已编辑 1 个文件
chat.html


成功
      navigator.clipboard.writeText(sessionId)        .then(() => { footLeft.textContent = 'SESSION ID COPIED'; })        .catch(() => {});    }  });
    if (navigator.clipboard &&  然后浏览器访问 `http://localhost:5500/chat.html`navigator.clipboard.writeText) {    if (navigator.clipboard &&     navigator.clipboard.writeText)     {      navigator.clipboard.writeText      (sessionId)        .then(() => { footLeft.        textContent = 'SESSION ID         COPIED'; })        .catch(() => {});    }  });
请接受上面的 diff 修改，然后刷新浏览器页面（F5 或 Ctrl+R）即可。

问题原因
chat.html:855 中，一段对话文本 然后浏览器访问 http://localhost:5500/chat.html`` 被意外插入到了 JavaScript 表达式中间：

JavaScript



// 错误：
if (navigator.clipboard &&  然后浏览器访问 `http://localhost:5500/chat.html`navigator.clipboard.writeText) {

// 正确：
if (navigator.clipboard && navigator.clipboard.writeText) {
JavaScript 解析器在遇到中文字符时无法理解，把后面的 navigator 也当成了非法标识符，于是抛出 SyntaxError: Unexpected identifier 'navigator'。这属于"代码被意外污染"的问题，修复后页面就能正常加载了。

我把这个项目上传到了 github 现在给这个项目写一个readme.md文件 要求排版精美，说明项目结构 项目实现功能 项目用到了哪些技术栈 生成可直接复制粘贴的md文件
16:41
已浏览 1 个目录，搜索 1 次文件
思考
已浏览
PythonProject
已搜索
README*
未找到结果
思考
README.md 不存在，这是新建文件。让我先快速确认几个关键配置信息，保证 README 内容准确：

已读取 1 个文件，搜索 1 次文件
已读取
config_data.py
找到 11 行
model|top_k|qwen|Qwen|QWEN
未找到结果
思考
已确认所有关键信息（模型 qwen3-max、嵌入 text-embedding-v2、top_k=4、chunk 1000/100 等）。现在生成 README.md，直接复制下面代码块的全部内容，保存为项目根目录的 README.md 即可：

Markdown



<div align="center">

# 🎮 英雄联盟 RAG 智能知识库

**基于 LangChain + Chroma + 通义千问的检索增强生成（RAG）问答系统**

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![LangChain](https://img.shields.io/badge/🦜%20LangChain-RAG-green?style=flat-square)](https://www.langchain.com/)
[![ChromaDB](https://img.shields.io/badge/VectorDB-Chroma-FF6136?style=flat-square)](https://www.trychroma.com/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Streamlit](https://img.shields.io/badge/UI-Streamlit-FF4B4B?style=flat-square&logo=streamlit&logoColor=white)](https://streamlit.io/)
[![DashScope](https://img.shields.io/badge/LLM-Qwen3--Max-6F42C1?style=flat-square)](https://dashscope.aliyun.com/)

*把英雄联盟攻略文档"喂"给 AI，让它成为你的专属峡谷军师* ⚔️

</div>

---

## 📖 项目简介

本项目是一个完整的 **RAG（Retrieval-Augmented Generation，检索增强生成）** 实战项目。以《英雄联盟》攻略文档为知识库语料，实现了从 **文档入库 → 向量检索 → 大模型问答** 的全链路，并提供了 **三种使用形态**：

| 形态 | 入口 | 适合场景 |
|------|------|----------|
| 🖥️ 赛博朋克风格 Web 前端 | `chat.html` + `backend_api.py` | 日常使用 / 演示，支持流式打字机效果 |
| 🔌 FastAPI 后端接口 | `backend_api.py` | 二次开发 / 对接任意前端 |
| 📦 Streamlit 双应用 | `app_file_uploader.py` / `app_qa.py` | 快速上传语料 / 轻量问答 |

## ✨ 核心功能

- 📤 **文档入库**：上传 TXT 文档，自动切片（chunk 1000 / overlap 100）并向量化存入 Chroma
- 🔁 **MD5 去重**：相同内容重复上传自动跳过，避免知识库冗余
- 🔍 **向量检索**：基于 DashScope `text-embedding-v2`（1024 维）的相似度检索，Top-K 可配置
- 💬 **多轮对话**：基于 `RunnableWithMessageHistory` 的会话记忆，按 `session_id` 隔离聊天历史
- ⚡ **流式输出**：SSE（Server-Sent Events）逐字推送，打字机般的回答体验
- 🌐 **多端支持**：纯 HTML 赛博朋克前端 + Streamlit 界面 + RESTful API 三选一

## 🏗️ 项目结构

```text
PythonProject/ ├── 🧠 核心业务层 │ ├── rag.py # RagService：RAG 问答链（检索→提示词→LLM→解析） │ ├── knowledge_base.py # KnowledgeBaseService：文档入库、MD5 去重、切片 │ ├── vector_stores.py # VectorStoreService：Chroma 向量库封装与检索 │ ├── file_history_store.py # 基于文件的聊天历史存储（会话隔离） │ └── config_data.py # 全局配置：模型名、API Key、切片参数、Top-K │ ├── 🔌 接口与界面层 │ ├── backend_api.py # FastAPI 后端：问答/流式/上传/检索 4 个接口 │ ├── chat.html # 赛博朋克风格 Web 前端（纯 HTML/CSS/JS） │ ├── app_file_uploader.py # Streamlit 文档上传应用 │ └── app_qa.py # Streamlit 知识库问答应用 │ ├── 📚 数据与存储 │ ├── Data/ # 知识库语料（英雄联盟攻略 TXT） │ │ ├── 装备出装指南.txt │ │ ├── 符文选择搭配.txt │ │ ├── 野区与地图机制.txt │ │ └── lol_arena_kb/ # 斗魂竞技场 / 大乱斗专题（6 篇） │ ├── chroma_db/ # Chroma 向量数据库（持久化） │ ├── chat_history/ # 各会话聊天记录 │ └── md5.text # 已入库文档 MD5 指纹（去重） │ └── main.py # 入口占位





## 🔄 工作原理

```text
┌──────────────┐ ┌───────────────┐ ┌──────────────────┐ │ TXT 文档上传 │──▶│ 切片 + 向量化 │──▶ │ Chroma 持久化 │ │ (MD5 去重) │ │ (embedding-v2) │ │ (chroma_db/) │ └──────────────┘ └───────────────┘ └────────┬─────────┘ │ Top-K 相似度检索 ┌──────────────┐ ┌───────────────┐ ┌────────▼─────────┐ │ 流式回答 SSE │ ◀──│ Qwen3-Max │ ◀── │ 组装增强 Prompt │ │ (打字机效果) │ │ (兼容模式) │ │ (历史+检索上下文) │ └──────────────┘ └───────────────┘ └──────────────────┘





## 🛠️ 技术栈

| 分类 | 技术 | 说明 |
|------|------|------|
| 🦜 编排框架 | LangChain | LCEL 链式编排、RunnableWithMessageHistory 会话记忆 |
| 🗃️ 向量数据库 | ChromaDB | 本地持久化存储，HNSW 索引 |
| 🧮 Embedding | DashScope `text-embedding-v2` | 阿里云通义文本向量模型（1024 维） |
| 🤖 大语言模型 | Qwen3-Max | 通过 OpenAI 兼容模式接入 DashScope |
| ⚙️ 后端框架 | FastAPI + Uvicorn | 高性能异步 API，自动生成 Swagger 文档 |
| 📊 快速原型 | Streamlit | 数据上传与问答的轻量级界面 |
| 🎨 前端 | 原生 HTML / CSS / JS | 赛博朋克风格 UI，SSE 流式渲染 |
| 🐍 运行环境 | Python 3.11 | — |

## 🚀 快速开始

### 1️⃣ 安装依赖

```bash
pip install langchain langchain-community langchain-chroma langchain-openai
chromadb dashscope fastapi "uvicorn[standard]" python-multipart
streamlit pydantic

### 2️⃣ 配置 API Key

注册 [阿里云百炼 DashScope](https://dashscope.aliyun.com/) 获取 API Key，设置环境变量：

```powershell
Windows PowerShell
$env:DASHSCOPE_API_KEY = "sk-你的APIKey"

### 3️⃣ 启动后端服务
```bash
python backend_api.py
服务运行于 http://127.0.0.1:8000
Swagger 文档：http://127.0.0.1:8000/docs

### 4️⃣ 打开 Web 前端
在项目根目录另开一个终端，启动静态服务器
python -m http.server 5500

浏览器访问 **<http://localhost:5500/chat.html>** 
