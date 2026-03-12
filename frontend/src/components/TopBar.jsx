import { Database, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopBar({ workspaceTitle, vectorDbStatus }) {
  const statusConfig = {
    connected: {
      color: "text-green-600",
      bgColor: "bg-green-100",
      text: "Connected",
      dotColor: "fill-green-600",
    },
    indexing: {
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      text: "Indexing",
      dotColor: "fill-amber-600",
    },
    disconnected: {
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      text: "Disconnected",
      dotColor: "fill-gray-600",
    },
  };

  const status = statusConfig[vectorDbStatus];

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {workspaceTitle}
        </h2>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full",
          status.bgColor,
        )}
      >
        <Database className="w-4 h-4" />
        <span className="text-sm font-medium">{status.text}</span>
        <Circle
          className={cn(
            "w-2 h-2",
            status.dotColor,
            vectorDbStatus === "indexing" && "animate-pulse",
          )}
        />
      </div>
    </div>
  );
}
