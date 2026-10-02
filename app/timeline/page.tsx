import { allNotes } from 'contentlayer/generated'
import { genPageMetadata } from 'app/seo'
import TimelineList from '@/components/TimelineList'

export const metadata = genPageMetadata({
  title: 'Timeline',
  description: 'Small pieces of thoughts, in order',
})

const isProduction = process.env.NODE_ENV === 'production'

export default function TimelinePage() {
  const notes = allNotes
    .filter((note) => !(isProduction && note.draft))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(({ slug, date, tags, body }) => ({ slug, date, tags: tags ?? [], html: body.html }))

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      <div className="space-y-2 pb-8 pt-6 md:space-y-5">
        <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
          Timeline
        </h1>
        <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
          Small pieces of thoughts that don't need a whole blog post.
        </p>
      </div>
      <TimelineList notes={notes} />
    </div>
  )
}
