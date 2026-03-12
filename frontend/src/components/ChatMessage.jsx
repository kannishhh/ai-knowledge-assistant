import { useState } from "react";
import { User, Sparkles, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { motion } from "motion/react"

export function ChatMessage({ role, content, sources, isTyping }) {
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);

  if (role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end mb-6"
      >
        <div className="flex items-start gap-3 max-w-2xl">
          <div className="bg-gray-900 text-white rounded-2xl rounded-tr-sm px-5 py-3">
            <p className="text-sm leading-relaxed">{content}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start mb-6"
    >
      <div className="flex items-start gap-3 max-w-3xl">
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="bg-linear-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-2xl rounded-tl-sm px-5 py-3">
            {isTyping ? (
              <div className="flex gap-1 py-2">
                <motion.div
                  className="w-2 h-2 bg-blue-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-blue-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-blue-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-gray-800">{content}</p>
            )}
          </div>

          {sources && sources.length > 0 && !isTyping && (
            <div className="mt-3">
              <button
                onClick={() => setIsSourcesExpanded(!isSourcesExpanded)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>
                  {sources.length} Source{sources.length > 1 ? "s" : ""}
                </span>
                {isSourcesExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {isSourcesExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-2"
                >
                  {sources.map((source, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-medium text-gray-700">
                          {source.documentName}
                          {source.page && ` • Page ${source.page}`}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        "{source.excerpt}"
                      </p>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
