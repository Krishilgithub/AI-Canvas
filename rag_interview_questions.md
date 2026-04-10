# Retrieval-Augmented Generation (RAG) Interview Questions

## 1. RAG Fundamentals

### Q1: What is RAG, and why would you choose it over fine-tuning an LLM?
**Answer:**
**RAG (Retrieval-Augmented Generation)** is an architecture where a knowledge base is queried for relevant information before generating a response. The retrieved context is appended to the user’s prompt, and the LLM synthesizes an answer.
**Why RAG over Fine-Tuning?**
1. **Factual Accuracy:** It grounds the LLM in actual documents, significantly reducing hallucinations.
2. **Up-to-date Knowledge:** You can update the knowledge base instantly (by updating the database) without needing to retrain or fine-tune the model.
3. **Traceability:** You can cite the exact source document the LLM used to formulate its answer.
4. **Cost:** It is far cheaper to do vector search than to continuously fine-tune an LLM on new data.

## 2. Embeddings & Search Techniques

### Q2: What is an Embedding, and how do Vector Databases work?
**Answer:**
An **Embedding** is a numerical representation of text in a high-dimensional continuous vector space. Text with similar meanings (e.g., "puppy" and "dog") will be placed close to each other in this space.
**Vector Databases (e.g., Pinecone, Qdrant, Milvus):** They use algorithms like HNSW (Hierarchical Navigable Small World) to perform rapid Nearest Neighbor search. They calculate distances (using Cosine Similarity or Euclidean Distance) to find the vectors (documents) closest to the user's query vector.

### Q3: What is the difference between Dense Vector Search (Cosine Similarity) and Sparse Keyword Search (BM25)? When would you use Hybrid Search?
**Answer:**
- **Dense Vector Search:** Understands semantic meaning. It can match "How do I return my purchase?" with "Refund Policy" even if they share zero identical words.
- **Sparse Search (BM25):** Based on exact keyword matching and term frequency. Outstanding for searching specific IDs, precise names, or acronyms ("Error Code 404", "John Doe").
- **Hybrid Search:** Combines both. It uses dense vectors for semantic context and BM25 for exact keyword matching, then merges and re-ranks the results through algorithms like Reciprocal Rank Fusion (RRF). This is the gold standard for RAG retrievals.

## 3. Data Processing & Chunking

### Q4: Why is Document Chunking necessary in RAG, and what is Chunk Overlap?
**Answer:**
Chunking splits large documents (like a 100-page PDF) into smaller pieces (e.g., 500-token chunks) before generating embeddings. 
**Why?** Embeddings of large texts dilute the semantic meaning, making retrieval inaccurate. Also, injecting entire books into an LLM prompt will exceed context window limits and escalate token costs.
**Chunk Overlap:** Including e.g. 50 tokens from the previous chunk. This ensures you don't accidentally split a sentence or a core conceptual thought exactly in half, preserving context across chunk boundaries.

## 4. Advanced RAG Techniques

### Q5: What is Re-ranking in a RAG pipeline, and why use Cross-Encoders?
**Answer:**
A fast Vector Database might retrieve the top 20 most similar documents, but vector similarity isn't perfect for relevance framing.
**Re-ranking** takes those top 20 documents and passes them to a specialized model (like Cohere Re-Rank or an MS MARCO Cross-Encoder). A Cross-Encoder computes an attention map across the query *and* the document simultaneously (instead of independently), scoring them for extreme relevance to pick the top 5 absolute best documents to send to the LLM. 

### Q6: What is the "Lost in the Middle" phenomenon, and how do you address it?
**Answer:**
Research shows that LLMs pay high attention to the *beginning* and *end* of their context window but tend to ignore or "lose" information placed precisely in the middle.
**Solutions:** 
- Keep the number of retrieved documents small (e.g., top 3-5).
- Use strict Re-ranking to ensure only highly relevant chunks are included.
- Use explicit prompt instructions emphasizing evaluating all provided context.

## 5. RAG Evaluation

### Q7: How do you evaluate the reliability and quality of a RAG system?
**Answer:**
Evaluating RAG requires testing both the Retriever and the Generator independently using frameworks like **RAGAS** or **TruLens**. Key metrics include:
- **Context Precision/Recall:** Did the vector database retrieve the right documents? 
- **Faithfulness (Hallucination Index):** Did the LLM base its answer *only* on the provided context, or did it invent facts?
- **Answer Relevance:** Does the generated answer actually respond directly to the user's question, or is it evasive?
