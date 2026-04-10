# AI / Machine Learning Model Interview Questions

## 1. Core Architectures

### Q1: Explain the Attention Mechanism in Transformer models.
**Answer:**
The Attention Mechanism allows a model to weigh the importance of different words in a sentence relative to a specific word being processed. Instead of processing text sequentially (like RNNs/LSTMs), transformers use **Self-Attention** to look at the entire context at once. It computes a score (using Queries, Keys, and Values) that determines how much "attention" a token should pay to every other token in the sequence, allowing the model to capture deep semantic relationships and long-range dependencies efficiently.

## 2. Model Types

### Q2: What is the difference between Encoder-only, Decoder-only, and Encoder-Decoder architectures?
**Answer:**
- **Encoder-only (e.g., BERT):** Uses bidirectional attention to understand the complete context of a text. Best for classification, sentiment analysis, and named entity recognition.
- **Decoder-only (e.g., GPT family, LLaMA):** Uses masked causal self-attention, meaning it can only look at previous tokens. It is optimized for auto-regressive text generation (predicting the next word).
- **Encoder-Decoder (e.g., T5, BART):** Combines both. The encoder processes the input text, and the decoder generates the output. Best for translation and summarization tasks.

## 3. Fine-Tuning & Optimization

### Q3: What is Parameter-Efficient Fine-Tuning (PEFT), and how does LoRA work?
**Answer:**
Fine-tuning large language models (10B+ parameters) is incredibly expensive because it requires updating all weights. **PEFT** allows fine-tuning by modifying only a tiny fraction of the parameters. 
**LoRA (Low-Rank Adaptation):** Freezes the pre-trained model weights and injects trainable low-rank decomposition matrices into the transformer layers. This reduces the number of trainable parameters by up to 10,000x and GPU memory requirements by 3x, while maintaining performance comparable to full fine-tuning.

### Q4: Explain the difference between Pre-training, Fine-tuning, and RLHF.
**Answer:**
1. **Pre-training:** Training an LLM on massive amounts of raw text using self-supervised learning entirely to predict the next word. (e.g., creating a base foundation model).
2. **Supervised Fine-Tuning (SFT):** Training the base model on specific instruction/response pairs (Q&A) so it learns to follow instructions rather than just continuing a sentence.
3. **RLHF (Reinforcement Learning from Human Feedback):** Aligning the model to human preferences. Humans rank the model's outputs, training a Reward Model. PPO (Proximal Policy Optimization) then uses this reward model to heavily penalize toxic, unhelpful, or hallucinatory outputs.

## 4. Text Generation Parameters

### Q5: Explain the impact of `Temperature` and `Top-p` (Nucleus Sampling) on an LLM's output.
**Answer:**
- **Temperature:** Controls randomness. A temperature of 0 makes the model entirely deterministic (always picking the most probable next word). Higher temperatures (e.g., 0.8) flatten the probability distribution, making the model more creative but potentially more erratic.
- **Top-p:** Instead of picking from the entire vocabulary, the model only samples from the smallest subset of words whose cumulative probability exceeds `p`. If `p=0.9`, it ignores the long tail of highly unlikely words.

## 5. Challenges

### Q6: What are LLM Hallucinations, and what are strategies to mitigate them?
**Answer:**
Hallucinations occur when an LLM confidently generates false, unverified, or nonsensical information. 
**Mitigation Strategies:**
1. **Grounding via RAG (Retrieval-Augmented Generation):** Forcing the model to answer only based on retrieved factual documents.
2. **Prompt Engineering:** Adding system instructions like "If you don't know the answer, say 'I don't know'."
3. **Lowering Temperature:** Setting lower values forces the model towards more statistically probable (and often more factual) tokens rather than creative leaps.
