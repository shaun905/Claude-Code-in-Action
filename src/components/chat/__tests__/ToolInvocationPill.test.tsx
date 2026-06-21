import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationPill, getToolLabel } from "../ToolInvocationPill";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Helper to build a ToolInvocation fixture
// ---------------------------------------------------------------------------

function makeInvocation(
  toolName: string,
  args: Record<string, string>,
  state: "call" | "result" = "call"
): ToolInvocation {
  const base = { toolCallId: "test-id", toolName, args };
  if (state === "result") {
    return { ...base, state: "result", result: "ok" } as ToolInvocation;
  }
  return { ...base, state: "call" } as ToolInvocation;
}

// ---------------------------------------------------------------------------
// getToolLabel unit tests — exercise the label logic without rendering
// ---------------------------------------------------------------------------

test("getToolLabel: str_replace_editor create → Creating <filename>", () => {
  const inv = makeInvocation("str_replace_editor", {
    command: "create",
    path: "/components/Card.jsx",
  });
  expect(getToolLabel(inv)).toBe("Creating Card.jsx");
});

test("getToolLabel: str_replace_editor str_replace → Editing <filename>", () => {
  const inv = makeInvocation("str_replace_editor", {
    command: "str_replace",
    path: "/App.jsx",
  });
  expect(getToolLabel(inv)).toBe("Editing App.jsx");
});

test("getToolLabel: str_replace_editor insert → Editing <filename>", () => {
  const inv = makeInvocation("str_replace_editor", {
    command: "insert",
    path: "/App.jsx",
  });
  expect(getToolLabel(inv)).toBe("Editing App.jsx");
});

test("getToolLabel: str_replace_editor view → Reading <filename>", () => {
  const inv = makeInvocation("str_replace_editor", {
    command: "view",
    path: "/App.jsx",
  });
  expect(getToolLabel(inv)).toBe("Reading App.jsx");
});

test("getToolLabel: str_replace_editor undo_edit → Undoing edit in <filename>", () => {
  const inv = makeInvocation("str_replace_editor", {
    command: "undo_edit",
    path: "/App.jsx",
  });
  expect(getToolLabel(inv)).toBe("Undoing edit in App.jsx");
});

test("getToolLabel: file_manager rename → Renaming <filename>", () => {
  const inv = makeInvocation("file_manager", {
    command: "rename",
    path: "/components/Card.jsx",
    new_path: "/components/CardNew.jsx",
  });
  expect(getToolLabel(inv)).toBe("Renaming Card.jsx");
});

test("getToolLabel: file_manager delete → Deleting <filename>", () => {
  const inv = makeInvocation("file_manager", {
    command: "delete",
    path: "/components/Card.jsx",
  });
  expect(getToolLabel(inv)).toBe("Deleting Card.jsx");
});

test("getToolLabel: unknown tool → prettified tool name fallback", () => {
  const inv = makeInvocation("some_unknown_tool", { command: "run", path: "/foo.js" });
  expect(getToolLabel(inv)).toBe("Some Unknown Tool");
});

// ---------------------------------------------------------------------------
// ToolInvocationPill render tests
// ---------------------------------------------------------------------------

test("in-progress state: shows spinner, no green dot, shows label", () => {
  const inv = makeInvocation(
    "str_replace_editor",
    { command: "create", path: "/components/Card.jsx" },
    "call"
  );
  const { container } = render(<ToolInvocationPill toolInvocation={inv} />);

  // Label text is present
  expect(screen.getByText("Creating Card.jsx")).toBeDefined();

  // Spinner svg should be present (lucide renders an svg)
  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeDefined();

  // Green dot should NOT be present
  const greenDot = container.querySelector(".bg-emerald-500");
  expect(greenDot).toBeNull();
});

test("completed state: shows green dot, no spinner, shows label", () => {
  const inv = makeInvocation(
    "str_replace_editor",
    { command: "create", path: "/components/Card.jsx" },
    "result"
  );
  const { container } = render(<ToolInvocationPill toolInvocation={inv} />);

  // Label text is present
  expect(screen.getByText("Creating Card.jsx")).toBeDefined();

  // Green dot should be present
  const greenDot = container.querySelector(".bg-emerald-500");
  expect(greenDot).toBeDefined();

  // Spinner should NOT be present
  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeNull();
});
