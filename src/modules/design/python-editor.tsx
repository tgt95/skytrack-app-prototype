/* Local syntax-highlighted Python draft editor. Script contents remain a non-executing UI draft. */

import { useRef, useState } from 'react'

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
    main()`

function pythonTokens(line: string) {
  const pattern = /("""[^"\n]*"""|"[^"\n]*"|'[^'\n]*'|#.*$|\b(?:from|import|def|yield|with|as|if|None)\b|\b\d+(?:\.\d+)?\b|[()[\],:=])/g
  const parts: React.ReactNode[] = []
  let start = 0
  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > start) parts.push(line.slice(start, index))
    const token = match[0]
    const kind = token.startsWith('#') ? 'comment'
      : token.startsWith('"') || token.startsWith("'") ? 'string'
        : /^\d/.test(token) ? 'number'
          : /^[a-zA-Z]/.test(token) ? 'keyword' : 'punctuation'
    parts.push(<span className={`ms-python-token-${kind}`} key={index}>{token}</span>)
    start = index + token.length
  }
  if (start < line.length) parts.push(line.slice(start))
  return parts
}

export function PythonEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const mirrorRef = useRef<HTMLDivElement>(null)
  const [activeLine, setActiveLine] = useState(1)
  const lines = value.split('\n')

  return (
    <div className='ms-python-editor'>
      <div className='ms-python-mirror' ref={mirrorRef} aria-hidden='true'>
        {lines.map((line, index) => (
          <div className={`ms-python-line${activeLine === index + 1 ? ' is-active' : ''}`} key={index}>
            <span className='ms-python-number'>{index + 1}</span>
            <span className='ms-python-source'>{pythonTokens(line) || ' '}</span>
          </div>
        ))}
      </div>
      <textarea
        id='ms-code-editor'
        className='ms-python-input'
        aria-label='Python mission script draft'
        aria-describedby='ms-code-limit'
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => {
          if (mirrorRef.current) {
            mirrorRef.current.scrollTop = event.currentTarget.scrollTop
            mirrorRef.current.scrollLeft = event.currentTarget.scrollLeft
          }
        }}
        onClick={(event) => setActiveLine(event.currentTarget.value.slice(0, event.currentTarget.selectionStart).split('\n').length)}
        onKeyUp={(event) => setActiveLine(event.currentTarget.value.slice(0, event.currentTarget.selectionStart).split('\n').length)}
        spellCheck={false}
        wrap='soft'
      />
    </div>
  )
}
