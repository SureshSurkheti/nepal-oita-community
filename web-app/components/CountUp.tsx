'use client'

import { useEffect, useRef } from 'react'

/* A statistic that counts up the first time it scrolls into view.
 *
 * The final value is rendered on the server, so with no JavaScript — or before
 * hydration — the number is simply correct rather than zero. */
export function CountUp({ to, suffix = '', className = 'stat__num' }:
  { to: number; suffix?: string; className?: string }) {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = el.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return

    let done = false
    const run = () => {
      if (done) return
      done = true
      const start = performance.now()
      const ms = 1100
      const tick = (now: number) => {
        const p = Math.min((now - start) / ms, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        node.textContent = Math.round(to * eased).toLocaleString() + (p === 1 ? suffix : '')
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { run(); io.disconnect() }
    }, { threshold: 0.5 })
    io.observe(node)
    return () => io.disconnect()
  }, [to, suffix])

  return <div className={className} ref={el}>{to.toLocaleString()}{suffix}</div>
}
