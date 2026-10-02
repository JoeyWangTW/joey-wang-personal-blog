'use client'

import { useEffect, useMemo, useState } from 'react'
import { slug as slugify } from 'github-slugger'
import siteMetadata from '@/data/siteMetadata'

export interface TimelineNote {
  slug: string
  date: string
  tags: string[]
  html: string
}

// Render times in a fixed zone so the static build and the browser agree
const TIME_ZONE = 'America/Los_Angeles'

const dayFormat = new Intl.DateTimeFormat(siteMetadata.locale, {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})
const timeFormat = new Intl.DateTimeFormat(siteMetadata.locale, {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
})

function readTagFromUrl() {
  return new URLSearchParams(window.location.search).get('tag')
}

export default function TimelineList({ notes }: { notes: TimelineNote[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null)

  useEffect(() => {
    setActiveTag(readTagFromUrl())
    const onPopState = () => setActiveTag(readTagFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const selectTag = (tag: string | null) => {
    setActiveTag(tag)
    const url = new URL(window.location.href)
    if (tag) url.searchParams.set('tag', tag)
    else url.searchParams.delete('tag')
    url.hash = ''
    window.history.pushState(null, '', url)
  }

  const tagCounts = useMemo(() => {
    const counts: Record<string, { label: string; count: number }> = {}
    notes.forEach((note) =>
      note.tags.forEach((tag) => {
        const key = slugify(tag)
        counts[key] = { label: counts[key]?.label ?? tag, count: (counts[key]?.count ?? 0) + 1 }
      })
    )
    return Object.entries(counts).sort((a, b) => b[1].count - a[1].count)
  }, [notes])

  const groups = useMemo(() => {
    const visible = activeTag
      ? notes.filter((note) => note.tags.some((t) => slugify(t) === activeTag))
      : notes
    const byDay: { day: string; notes: TimelineNote[] }[] = []
    visible.forEach((note) => {
      const day = dayFormat.format(new Date(note.date))
      const last = byDay[byDay.length - 1]
      if (last && last.day === day) last.notes.push(note)
      else byDay.push({ day, notes: [note] })
    })
    return byDay
  }, [notes, activeTag])

  const tagButtonClass = (selected: boolean) =>
    `rounded-full px-3 py-1 text-sm font-medium uppercase transition-colors ${
      selected
        ? 'bg-primary-500 text-white'
        : 'bg-gray-100 text-gray-600 hover:text-primary-500 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-primary-400'
    }`

  return (
    <div className="py-8">
      {tagCounts.length > 0 && (
        <div className="mb-10 flex flex-wrap gap-2">
          <button className={tagButtonClass(activeTag === null)} onClick={() => selectTag(null)}>
            All ({notes.length})
          </button>
          {tagCounts.map(([key, { label, count }]) => (
            <button
              key={key}
              className={tagButtonClass(activeTag === key)}
              onClick={() => selectTag(activeTag === key ? null : key)}
            >
              {label.split(' ').join('-')} ({count})
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">Nothing on the timeline yet.</p>
      )}

      {groups.map(({ day, notes: dayNotes }) => (
        <section key={day} className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {day}
          </h2>
          <ol className="relative ml-2 border-l border-gray-200 dark:border-gray-700">
            {dayNotes.map((note) => (
              <li key={note.slug} id={note.slug} className="mb-8 ml-6 scroll-mt-24">
                <span className="absolute -left-[5px] mt-2 h-2.5 w-2.5 rounded-full bg-primary-500" />
                <a
                  href={`#${note.slug}`}
                  className="text-sm text-gray-500 hover:text-primary-500 dark:text-gray-400"
                >
                  <time dateTime={note.date}>{timeFormat.format(new Date(note.date))}</time>
                </a>
                <div
                  className="prose mt-1 max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: note.html }}
                />
                {note.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-3">
                    {note.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => selectTag(slugify(tag))}
                        className="text-sm font-medium uppercase text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        #{tag.split(' ').join('-')}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
