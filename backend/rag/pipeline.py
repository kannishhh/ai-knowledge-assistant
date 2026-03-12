from services.vector_store import get_vectorstore
from services.llm import ask_llm, stream_llm
import time
import re

TOP_K = 2
SEARCH_K = 3
RELEVANCE_THRESHOLD = 0.7
MAX_CHUNK_CHARS = 800
MAX_CONTEXT_CHARS = 1800
MAX_PROMPT_CHARS = 3200
SOURCE_EXCERPT_CHARS = 220
LLM_TIMEOUT_S = 20


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def _build_prompt(query: str, context: str) -> str:
    return (
        "You are a RAG assistant. Answer using only the provided context. "
        "If the answer is not present, say: I don't know based on the documents.\n\n"
        "Keep the answer concise (max 5 bullet points).\n\n"
        f"Context:\n{context}\n\n"
        f"Question:\n{query}"
    )


def _prepare_rag_input(query: str):
    vectorstore = get_vectorstore()

    t0 = time.time()
    docs_with_scores = vectorstore.similarity_search_with_score(query, k=SEARCH_K)
    t1 = time.time()

    if not docs_with_scores:
        return {
            "answer": "No documents found in the knowledge base.",
            "sources": [],
            "timings": {"retrieval": t1 - t0, "context_build": 0.0},
            "prompt": None,
        }

    best_score = docs_with_scores[0][1]
    if best_score > RELEVANCE_THRESHOLD:
        return {
            "answer": "This question does not seem related to the uploaded documents.",
            "sources": [],
            "timings": {"retrieval": t1 - t0, "context_build": 0.0},
            "prompt": None,
        }

    selected = docs_with_scores[:TOP_K]
    context_parts = []
    sources = []
    used_chars = 0

    for doc, score in selected:
        text = _normalize_text(doc.page_content)
        if not text:
            continue

        text = text[:MAX_CHUNK_CHARS]
        remaining = MAX_CONTEXT_CHARS - used_chars
        if remaining <= 0:
            break

        clipped = text[:remaining]
        context_parts.append(clipped)
        used_chars += len(clipped)

        sources.append(
            {
                "excerpt": clipped[:SOURCE_EXCERPT_CHARS],
                "score": float(score),
                "metadata": doc.metadata or {},
            }
        )

    context = "\n\n".join(context_parts)
    prompt = _build_prompt(query=query, context=context)
    if len(prompt) > MAX_PROMPT_CHARS:
        overflow = len(prompt) - MAX_PROMPT_CHARS
        safe_context_len = max(300, len(context) - overflow)
        context = context[:safe_context_len]
        prompt = _build_prompt(query=query, context=context)

    t2 = time.time()
    return {
        "answer": None,
        "sources": sources,
        "timings": {
            "retrieval": t1 - t0,
            "context_build": t2 - t1,
            "prompt_chars": len(prompt),
            "context_chars": len(context),
        },
        "prompt": prompt,
    }


def ask_question(query):
    prepared = _prepare_rag_input(query)
    if prepared["prompt"] is None:
        return {"answer": prepared["answer"], "sources": prepared["sources"]}

    prompt = prepared["prompt"]
    t2 = time.time()
    answer = ask_llm(prompt, timeout_s=LLM_TIMEOUT_S)
    t3 = time.time()

    print("\n======= RAG TIMING  =======\n")
    print(f"retrieval time: {prepared['timings']['retrieval']:.3f}s")
    print(f"context build: {prepared['timings']['context_build']:.3f}s")
    print(f"prompt chars : {prepared['timings']['prompt_chars']}")
    print(f"context chars: {prepared['timings']['context_chars']}")
    print(f"llm response : {t3-t2:.3f}s")
    print(
        f"total time: {prepared['timings']['retrieval'] + prepared['timings']['context_build'] + (t3 - t2):.3f}s"
    )
    print("---------------------------------\n")

    return {"answer": answer, "sources": prepared["sources"]}


def ask_question_stream(query):
    prepared = _prepare_rag_input(query)
    if prepared["prompt"] is None:
        yield {
            "type": "final",
            "answer": prepared["answer"],
            "sources": prepared["sources"],
            "metrics": prepared["timings"],
        }
        return

    prompt = prepared["prompt"]
    started = time.time()
    pieces = []

    for token in stream_llm(prompt, timeout_s=LLM_TIMEOUT_S):
        pieces.append(token)
        yield {"type": "token", "content": token}

    answer = _normalize_text("".join(pieces)) or "I couldn't generate a response."
    llm_time = time.time() - started

    yield {
        "type": "final",
        "answer": answer,
        "sources": prepared["sources"],
        "metrics": {
            **prepared["timings"],
            "llm": llm_time,
            "total": prepared["timings"]["retrieval"]
            + prepared["timings"]["context_build"]
            + llm_time,
        },
    }
