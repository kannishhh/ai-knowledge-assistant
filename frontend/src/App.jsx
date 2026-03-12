import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { ChatArea } from "./components/ChatArea";
import { ChatInput } from "./components/ChatInput";
import { UploadModal } from "./components/UploadModal";
import { streamQuestion } from "./api/api";

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);

  const [selectedDocumentId, setSelectedDocumentId] = useState();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [vectorDbStatus, setVectorDbStatus] = useState("connected");
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/documents");
        const data = await res.json();
        setDocuments(data);
      } catch (err) {
        console.error("Failed to load documents", err);
      }
    };

    loadDocuments();
  }, []);

  const handleSendMessage = async (content) => {
    if (isAsking) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const typingMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      isTyping: true,
    };

    setMessages((prev) => [...prev, userMessage, typingMessage]);
    setIsAsking(true);

    try {
      await streamQuestion({
        query: content,
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    isTyping: false,
                    content: `${msg.content}${token}`,
                  }
                : msg,
            ),
          );
        },
        onFinal: (event) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    isTyping: false,
                    content: event.answer || msg.content,
                    sources: (event.sources || []).map((src, i) => ({
                      documentName: src.metadata?.source
                        ? src.metadata.source.split("/").pop()
                        : `Chunk ${i + 1}`,
                      excerpt: src.excerpt,
                      page: src.metadata?.page,
                    })),
                  }
                : msg,
            ),
          );
        },
        onError: () => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    isTyping: false,
                    content: "Error contacting AI server.",
                  }
                : msg,
            ),
          );
        },
      });
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                isTyping: false,
                content: "Error contacting AI server.",
              }
            : msg,
        ),
      );
    } finally {
      setIsAsking(false);
    }
  };

  const handleUpload = async (files) => {
    const newDocuments = files.map((file, index) => ({
      id: (Date.now() + index).toString(),
      name: file.name,
      type: file.name.split(".").pop() || "unknown",
      status: "indexing",
    }));

    setDocuments((prev) => [...prev, ...newDocuments]);
    setVectorDbStatus("indexing");

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        await fetch("http://127.0.0.1:8000/upload", {
          method: "POST",
          body: formData,
        });
      }

      setDocuments((prev) =>
        prev.map((doc) =>
          newDocuments.find((nd) => nd.id === doc.id)
            ? { ...doc, status: "indexed" }
            : doc,
        ),
      );

      setVectorDbStatus("connected");
    } catch (err) {
      console.error(err);
      setVectorDbStatus("disconnected");
    }
  };

  return (
    <div
      className="size-full flex flex-col bg-gray-50"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          documents={documents}
          onUploadClick={() => setIsUploadModalOpen(true)}
          selectedDocumentId={selectedDocumentId}
          onDocumentSelect={setSelectedDocumentId}
        />

        <div className="flex-1 flex flex-col">
          <TopBar
            workspaceTitle="My Knowledge Base"
            vectorDbStatus={vectorDbStatus}
          />

          <ChatArea messages={messages} />

          <ChatInput
            onSendMessage={handleSendMessage}
            onAttachmentClick={() => setIsUploadModalOpen(true)}
            disabled={vectorDbStatus === "indexing" || isAsking}
          />
        </div>
      </div>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  );
}
