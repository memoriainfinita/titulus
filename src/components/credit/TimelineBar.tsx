"use client"

import * as React from "react"

interface TimelineBarProps {
  progressRef: React.MutableRefObject<number>
  // null = playing/idle (follow progressRef); number = a seek is active (frozen at that value)
  seekValue: number | null
  onSeekStart: () => void
  onSeek: (v: number) => void
}

// Progress bar under the stage. When no seek is active it follows progressRef via
// its own RAF (no parent re-render). When a seek is active (scrubbing OR frozen
// after release) it shows the controlled seek value — so the thumb never jumps back.
export function TimelineBar({ progressRef, seekValue, onSeekStart, onSeek }: TimelineBarProps) {
  const seekActive = seekValue !== null
  const [display, setDisplay] = React.useState(0)
  React.useEffect(() => {
    if (seekActive) return
    let raf: number
    const loop = () => {
      setDisplay(progressRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [seekActive, progressRef])

  const value = seekActive ? (seekValue as number) : display
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.001}
      value={value}
      onPointerDown={onSeekStart}
      onChange={(e) => onSeek(parseFloat(e.target.value))}
      className="w-full accent-primary cursor-pointer"
      aria-label="Línea de tiempo"
    />
  )
}
