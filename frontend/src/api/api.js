import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

const API_BASE_URL = "http://127.0.0.1:8000";

export const askQuestion = async (query, signal) => {
  const res = await API.post(
    "/ask",
    { query },
    {
      signal,
    },
  );
  return res.data;
};

export const streamQuestion = async ({
  query,
  onToken,
  onFinal,
  onError,
  signal,
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ask/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Stream request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);

        if (event.type === "token" && event.content) {
          onToken?.(event.content);
        }

        if (event.type === "final") {
          onFinal?.(event);
        }
      }
    }

    if (buffer.trim()) {
      const finalEvent = JSON.parse(buffer);
      if (finalEvent.type === "final") {
        onFinal?.(finalEvent);
      }
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    onError?.(error);
  }
};

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await API.post("/upload", formData);
  return res.data;
};
