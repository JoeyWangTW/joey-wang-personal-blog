'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from '@/components/Link'

const PASSWORD_KEY = 'timeline-admin-password'

type Status =
  | { state: 'idle' }
  | { state: 'posting' }
  | { state: 'done'; commitUrl?: string }
  | { state: 'error'; message: string }

export default function NewNoteForm() {
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

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus({ state: 'posting' })
    const res = await fetch('/api/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
      body: JSON.stringify({
        content,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    }).catch(() => null)
    const data = await res?.json().catch(() => ({}))
    if (!res?.ok) {
      setStatus({ state: 'error', message: data?.error ?? 'Network error' })
      return
    }
    try {
      localStorage.setItem(PASSWORD_KEY, password)
    } catch {
      // ignore
    }
    setContent('')
    setStatus({ state: 'done', commitUrl: data.commitUrl })
  }

  const inputClass =
    'w-full rounded-md border-gray-300 bg-white text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

  return (
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
          Posted. It will show on the <Link href="/timeline">timeline</Link> after the site
          redeploys (usually a minute or two).
          {status.commitUrl && (
            <>
              {' '}
              <Link href={status.commitUrl}>View commit</Link>
            </>
          )}
        </p>
      )}
      {status.state === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </form>
  )
}
