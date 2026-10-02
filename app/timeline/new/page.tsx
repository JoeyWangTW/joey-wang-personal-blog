import { genPageMetadata } from 'app/seo'
import NewNoteForm from '@/components/NewNoteForm'

export const metadata = genPageMetadata({
  title: 'New note',
  robots: { index: false, follow: false },
})

export default function NewNotePage() {
  return (
    <div className="space-y-2 pb-8 pt-6 md:space-y-5">
      <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10">
        New note
      </h1>
      <NewNoteForm />
    </div>
  )
}
