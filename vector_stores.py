from langchain_chroma import Chroma
import config_data as config

class VectorStoreService(object):
    def __init__(self, embedding):
        """
        :param embedding: 嵌入模型的传入
        """
        self.embedding = embedding

        self.vector_store = Chroma(
            collection_name= config.collection_name,
            embedding_function= self.embedding,
            persist_directory= config.persist_directory
        )

    def get_retriever(self):
        """返回向量检索器，方便加入chain"""
        return self.vector_store.as_retriever(search_kwargs = {
            "k": config.top_k,
        })


if __name__ == '__main__':
    from langchain_community.embeddings import DashScopeEmbeddings
    retriever = VectorStoreService(DashScopeEmbeddings(model=config.embedding_model_name)).get_retriever()

    res = retriever.invoke("盖伦出门装出什么")
    print(res)