from google import genai
import os
import time

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
DEFAULT_TIMEOUT_S = int(os.getenv("GEMINI_TIMEOUT_S", "20"))


def _extract_text(response) -> str:
    text = getattr(response, "text", None)
    if text:
        return text

    try:
        return response.candidates[0].content.parts[0].text
    except Exception:
        return ""


def ask_llm(prompt: str, timeout_s: int = DEFAULT_TIMEOUT_S) -> str:

    started = time.time()

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config={"temperature": 0, "max_output_tokens": 220},
        )
        text = _extract_text(response).strip()
        if not text:
            return "I couldn't generate a response."
        return text
    except Exception as exc:
        print(f"Gemini generate_content failed: {exc}")
        elapsed = time.time() - started
        if elapsed > timeout_s:
            return "The model took too long to respond. Please try a shorter question."
        return "I couldn't generate a response."


def stream_llm(prompt: str, timeout_s: int = DEFAULT_TIMEOUT_S):
    started = time.time()
    try:
        stream = client.models.generate_content_stream(
            model=MODEL_NAME,
            contents=prompt,
            config={"temperature": 0, "max_output_tokens": 220},
        )

        for chunk in stream:
            if (time.time() - started) > timeout_s:
                break

            text = _extract_text(chunk)
            if text:
                yield text
    except Exception as exc:
        print(f"Gemini stream failed: {exc}")
