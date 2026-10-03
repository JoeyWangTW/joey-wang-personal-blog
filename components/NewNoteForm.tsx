'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from '@/components/Link'
import type { Note } from '@/lib/timeline'

const PASSWORD_KEY = 'timeline-admin-password'

type Status =
  | { state: 'idle' }
  | { state: 'posting' }
  | { state: 'done' }
  | { state: 'error'; message: string }

export default function NewNoteForm({ recent }: { recent: Note[] }) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>({ state: 'idle' })

  useEffect(() => {
    try {
      setPassword(localStorage.getItem(PASSWORD_KEY) ?? '')
    } catch {
      // storage unavailable; the password just won't be remembered
    }
  }, [])

  const send = async (method: 'POST' | 'DELETE', body: unknown) => {
    const res = await fetch('/api/timeline', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
      body: JSON.stringify(body),
    }).catch(() => null)
    const data = await res?.json().catch(() => ({}))
    if (!res?.ok) return data?.error ?? 'Network error'
    try {
      localStorage.setItem(PASSWORD_KEY, password)
    } catch {
      // ignore
    }
    return null
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus({ state: 'posting' })
    const error = await send('POST', {
      content,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })
    if (error) {
      setStatus({ state: 'error', message: error })
      return
    }
    setContent('')
    setStatus({ state: 'done' })
    router.refresh()
  }

  const remove = async (note: Note) => {
    if (!window.confirm(`Delete this note?\n\n${note.content.slice(0, 200)}`)) return
    const error = await send('DELETE', { id: note.id })
    if (error) {
      setStatus({ state: 'error', message: error })
      return
    }
    router.refresh()
  }

  const inputClass =
    'w-full rounded-md border-gray-300 bg-white text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

  return (
    <div className="space-y-10">
      <form onSubmit={submit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit()
          }}
          placeholder="What's on your mind? (Markdown supported)"
          rows={8}
          required
          className={inputClass}
        />
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags, comma separated (e.g. ai, startup)"
          className={inputClass}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={status.state === 'posting'}
            className="rounded-md bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {status.state === 'posting' ? 'Posting…' : 'Post'}
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">⌘/Ctrl + Enter to post</span>
        </div>
        {status.state === 'done' && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Posted. See it on the <Link href="/timeline">timeline</Link>.
          </p>
        )}
        {status.state === 'error' && (
          <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
        )}
      </form>

      {recent.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Recent notes</h2>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {recent.map((note) => (
              <li key={note.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-gray-700 dark:text-gray-300">{note.content}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(note.createdAt).toLocaleString()}
                    {note.tags.length > 0 && ` · ${note.tags.join(', ')}`}
                  </p>
                </div>
                <button
                  onClick={() => remove(note)}
                  className="shrink-0 text-sm text-red-600 hover:underline dark:text-red-400"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
