/* Local syntax-highlighted Python draft editor. Script contents remain a non-executing UI draft. */

import { useRef, useState, type ReactNode } from "react";

export const PYTHON_SAMPLE = `"""This sample demonstrates how to control a drone using Python. You can customize the flight scenario by adding additional steps."""

from typing import Any, Iterator
from local_planner import (
    boot_drone,
    takeoff,
    fly_to,
    land,
)

def scenario(ctx: Any) -> Iterator[Any]:
    yield takeoff(alt_m=2.0)
    yield fly_to(north=5, east=0, alt_m=2)
    yield fly_to(north=0, east=0, alt_m=2)
    yield land()

scenario.requires_senses = ["pose", "obstacle", "status"]

def main() -> None:
    with boot_drone() as drone:
        drone.fly(scenario)
        drone.run()

if __name__ == "__main__":
    main()`;

const PYTHON_KEYWORDS = new Set([
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "case",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
]);
const PYTHON_TYPES = new Set([
  "Any",
  "bool",
  "dict",
  "float",
  "int",
  "Iterator",
  "list",
  "set",
  "str",
  "tuple",
]);
const PYTHON_CONSTANTS = new Set(["False", "None", "True"]);

function pythonTokens(line: string) {
  const pattern =
    /(""".*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|\b[A-Za-z_][\w]*\b|\b\d+(?:\.\d+)?\b|[()[\]{}.,:=+*/%<>!-]+)/g;
  const parts: ReactNode[] = [];
  let start = 0;
  let nextDeclaration: "function" | "type" | null = null;
  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > start) parts.push(line.slice(start, index));
    const token = match[0];
    let kind: string | null = null;
    if (token.startsWith("#")) kind = "comment";
    else if (/^(?:"|'|'''|""")/.test(token)) kind = "string";
    else if (/^\d/.test(token)) kind = "number";
    else if (/^[A-Za-z_]/.test(token)) {
      if (PYTHON_KEYWORDS.has(token)) {
        kind = "keyword";
        if (token === "def") nextDeclaration = "function";
        else if (token === "class") nextDeclaration = "type";
      } else if (PYTHON_CONSTANTS.has(token)) {
        kind = "constant";
        nextDeclaration = null;
      } else if (nextDeclaration) {
        kind = nextDeclaration;
        nextDeclaration = null;
      } else if (PYTHON_TYPES.has(token)) {
        kind = "type";
      } else if (/^\s*\(/.test(line.slice(index + token.length))) {
        kind = "function";
      }
    } else if (/^[()[\]{}.,:=+*/%<>!-]+$/.test(token)) {
      kind = "punctuation";
    }
    parts.push(
      kind ? (
        <span className={`ms-python-token-${kind}`} key={index}>
          {token}
        </span>
      ) : (
        token
      ),
    );
    start = index + token.length;
  }
  if (start < line.length) parts.push(line.slice(start));
  return parts;
}

export function PythonEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [activeLine, setActiveLine] = useState(1);
  const lines = value.split("\n");

  return (
    <div
      className='ms-python-editor relative flex-[1_1_auto] min-h-0 bg-(--ms-code-canvas) text-(--ms-code-ink) font-["IBM_Plex_Mono",ui-monospace,SFMono-Regular,Menlo,monospace] text-xs leading-[1.55] [font-variant-ligatures:none]'
      data-testid="ms-python-editor"
    >
      <div
        className=" absolute inset-0 box-border w-full h-full m-0 overflow-auto [font:inherit] leading-[inherit] tracking-[inherit] tab-4 pt-3 pr-3 pb-3 pl-0 pointer-events-none"
        ref={mirrorRef}
        aria-hidden="true"
        data-testid="ms-python-mirror"
      >
        {lines.map((line, index) => (
          <div
            className={[
              `ms-python-line${activeLine === index + 1 ? " is-active" : ""}`,
              "grid grid-cols-[2.375rem_minmax(0,1fr)] min-h-[1.55em]",
            ]
              .filter(Boolean)
              .join(" ")}
            key={index}
          >
            <span
              className="ms-python-line-number pr-2 text-right [user-select:none]"
              data-testid="ms-python-number"
            >
              {index + 1}
            </span>
            <span
              data-testid="ms-python-source"
              className="pl-2.5 whitespace-pre-wrap wrap-anywhere"
            >
              {pythonTokens(line) || " "}
            </span>
          </div>
        ))}
      </div>
      <textarea
        id="ms-code-editor"
        className="absolute inset-0 box-border w-full h-full m-0 overflow-auto [font:inherit] leading-[inherit] tracking-[inherit] tab-4 z-1 block pt-3 pr-3 pb-3 pl-12 [border:0] rounded-none resize-none outline-none bg-transparent text-transparent [-webkit-text-fill-color:transparent] caret-(--ms-code-ink) whitespace-pre-wrap wrap-anywhere [&::selection]:bg-(--ms-code-selection)"
        aria-label="Python mission script draft"
        aria-describedby="ms-code-limit"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onDragOver={(event) => {
          if (
            event.dataTransfer.types.includes(
              "application/x-skytrack-ai-model-path",
            ) ||
            event.dataTransfer.types.includes("text/plain")
          ) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const path =
            event.dataTransfer.getData(
              "application/x-skytrack-ai-model-path",
            ) || event.dataTransfer.getData("text/plain");
          if (!path) return;
          const input = event.currentTarget;
          const start = input.selectionStart;
          const end = input.selectionEnd;
          onChange(`${value.slice(0, start)}${path}${value.slice(end)}`);
          setActiveLine(value.slice(0, start).split("\n").length);
          requestAnimationFrame(() => {
            input.focus();
            input.setSelectionRange(start + path.length, start + path.length);
          });
        }}
        onScroll={(event) => {
          if (mirrorRef.current) {
            mirrorRef.current.scrollTop = event.currentTarget.scrollTop;
            mirrorRef.current.scrollLeft = event.currentTarget.scrollLeft;
          }
        }}
        onClick={(event) =>
          setActiveLine(
            event.currentTarget.value
              .slice(0, event.currentTarget.selectionStart)
              .split("\n").length,
          )
        }
        onKeyUp={(event) =>
          setActiveLine(
            event.currentTarget.value
              .slice(0, event.currentTarget.selectionStart)
              .split("\n").length,
          )
        }
        spellCheck={false}
        wrap="soft"
      />
    </div>
  );
}
