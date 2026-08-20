'use client'

import { useState, useTransition } from 'react'

type Result = { ok: boolean; message: string }

export type ActionItem = {
  id: string
  initial: string
  title: string
  badge?: string | null
  meta?: string
  body?: string
  actions: { label: string; fields: Record<string, string>; action: 'status' | 'remove' }[]
}

/* A plain list of things with a few buttons each — used by the stories and
   messages screens. Kept generic because both wanted the same shape, and two
   near-identical files drift the moment one gets a fix. */
export function AdminActionList({
  items, onStatus, onRemove, empty,
}: {
  items: ActionItem[]
  onStatus: (fd: FormData) => Promise<Result>
  onRemove: (fd: FormData) => Promise<Result>
  empty: string
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<Result | null>(null)

  const run = (which: 'status' | 'remove', fields: Record<string, string>) => () =>
    startTransition(async () => {
      const fd = new FormData()
      for (const [k, v] of Object.entries(fields)) fd.set(k, v)
      setResult(await (which === 'status' ? onStatus(fd) : onRemove(fd)))
    })

  if (items.length === 0) return <p className="muted">{empty}</p>

  return (
    <>
      {result && (
        <p className={`form-note${result.ok ? '' : ' form-note--error'}`}>{result.message}</p>
      )}
      <ul className="roster">
        {items.map((it) => (
          <li key={it.id}>
            <span className="avatar" aria-hidden="true">{it.initial}</span>
            <span>
              <span className="roster__name">
                {it.title}
                {it.badge && <span className="text-sm muted"> · {it.badge}</span>}
              </span><br />
              {it.meta && <><span className="roster__meta">{it.meta}</span><br /></>}
              {it.body && <span className="roster__meta">{it.body}</span>}
              <span className="roster__links">
                {it.actions.map((a) => (
                  <button key={a.label} type="button" disabled={pending}
                          onClick={run(a.action, a.fields)}>
                    {a.label}
                  </button>
                ))}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
