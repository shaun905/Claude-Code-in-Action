"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface ToolInvocationPillProps {
  toolInvocation: ToolInvocation;
}

/**
 * Extracts the filename from a path string.
 * e.g. "/components/Card.jsx" → "Card.jsx"
 */
function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

/**
 * Converts an internal tool name to a readable fallback label.
 * e.g. "str_replace_editor" → "Str Replace Editor"
 */
function prettifyToolName(toolName: string): string {
  return toolName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Derives a human-friendly action label from a tool invocation's name and args.
 * Returns strings like "Creating Card.jsx" or "Editing App.jsx".
 */
export function getToolLabel(toolInvocation: ToolInvocation): string {
  const args = toolInvocation.args as Record<string, string> | undefined;
  const command = args?.command;
  const file = args?.path ? basename(args.path) : null;

  if (toolInvocation.toolName === "str_replace_editor" && file) {
    switch (command) {
      case "create":
        return `Creating ${file}`;
      case "str_replace":
      case "insert":
        return `Editing ${file}`;
      case "view":
        return `Reading ${file}`;
      case "undo_edit":
        return `Undoing edit in ${file}`;
    }
  }

  if (toolInvocation.toolName === "file_manager" && file) {
    switch (command) {
      case "rename":
        return `Renaming ${file}`;
      case "delete":
        return `Deleting ${file}`;
    }
  }

  // Fall back to a prettified version of the tool name
  return prettifyToolName(toolInvocation.toolName);
}

/**
 * Renders a pill showing what file operation Claude is performing.
 * Displays a spinner while in-progress and a green dot when complete.
 */
export function ToolInvocationPill({ toolInvocation }: ToolInvocationPillProps) {
  // A tool is complete when state is "result" and a result value exists
  const isComplete =
    toolInvocation.state === "result" &&
    (toolInvocation as { result?: unknown }).result !== undefined;

  const label = getToolLabel(toolInvocation);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        // Green dot indicates the operation finished successfully
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        // Spinner indicates the operation is still running
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
