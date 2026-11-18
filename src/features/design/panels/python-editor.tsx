/* Local syntax-highlighted Python draft editor. Script contents remain a non-executing UI draft. */

import { useRef, useState } from "react";
import {
  CodeBlockContent,
  CodeBlockLine,
  useHighlightedCode,
} from "skytrack-ui/code-block";

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
  const highlightedLines = useHighlightedCode(value, "python");

  return (
    <div
      className={[
        "ms-python-editor relative flex-[1_1_auto] min-h-0 bg-(--ms-code-canvas) text-(--ms-code-ink) font-mono text-sm leading-6 [font-variant-ligatures:none]",
        "[--ms-code-canvas:#ffffff] [--ms-code-ink:#000000] [--ms-code-selection:#add6ff] [.dark_&]:[--ms-code-canvas:#1e1e1e] [.dark_&]:[--ms-code-ink:#d4d4d4] [.dark_&]:[--ms-code-selection:#264f78]",
      ].join(" ")}
      data-testid="ms-python-editor"
    >
      <div
        className="absolute inset-0 box-border w-full h-full m-0 overflow-auto [font:inherit] leading-[inherit] tracking-[inherit] tab-4 pointer-events-none"
        ref={mirrorRef}
        aria-hidden="true"
        data-testid="ms-python-mirror"
      >
        <CodeBlockContent
          className="min-h-full max-w-none"
          lineNumbers
          wrap
          tabIndex={-1}
          style={{
            padding: "12px 12px 12px 0",
            minHeight: "100%",
            overflow: "visible",
            color: "var(--ms-code-ink)",
          }}
        >
          {highlightedLines.map((line, index) => (
            <CodeBlockLine
              key={index}
              variant={activeLine === index + 1 ? "highlighted" : "default"}
            >
              {line || "\u00a0"}
            </CodeBlockLine>
          ))}
        </CodeBlockContent>
      </div>
      <textarea
        id="ms-code-editor"
        className="absolute inset-0 box-border w-full h-full m-0 overflow-auto [font:inherit] leading-[inherit] tracking-[inherit] tab-4 z-1 block pt-3 pr-3 pb-3 [border:0] rounded-none resize-none outline-none bg-transparent text-transparent [-webkit-text-fill-color:transparent] caret-(--ms-code-ink) whitespace-pre-wrap wrap-anywhere [&::selection]:bg-(--ms-code-selection) [&::selection]:text-(--ms-code-ink) [&::selection]:[-webkit-text-fill-color:var(--ms-code-ink)]"
        aria-label="Python mission script draft"
        aria-describedby="ms-code-limit"
        value={value}
        style={{
          paddingLeft: `calc(${Math.max(2, String(lines.length).length)}ch + 2.625rem)`,
        }}
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
