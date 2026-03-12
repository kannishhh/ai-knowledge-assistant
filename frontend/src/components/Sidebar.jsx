import { Upload, FileText, CheckCircle2, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export function Sidebar({
  documents,
  onUploadClick,
  selectedDocumentId,
  onDocumentSelect,
}) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">AI Knowledge</h1>
            <p className="text-sm text-gray-500">Assistant</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200">
        <Button
          onClick={onUploadClick}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Documents</h2>
        <div className="space-y-2">
          {documents.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-8">
              No documents uploaded yet
            </div>
          ) : (
            documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onDocumentSelect(doc.id)}
                className={cn(
                  "w-full p-3 rounded-lg border transition-all text-left",
                  selectedDocumentId === doc.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300",
                )}
              >
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {doc.type.toUpperCase()}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {doc.status === "indexed" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          {documents.length} document{documents.length !== 1 ? "s" : ""} indexed
        </div>
      </div>
    </div>
  );
}
