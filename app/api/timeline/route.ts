import { createHash, timingSafeEqual } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createNote, deleteNote } from '@/lib/timeline'

// Required env: TIMELINE_ADMIN_PASSWORD, DATABASE_URL (set by the Vercel Neon integration)
const MAX_CONTENT_LENGTH = 10000
const MAX_TAGS = 10

function isAuthorized(request: Request) {
  const expected = process.env.TIMELINE_ADMIN_PASSWORD
  const provided = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!expected || !provided) return false
  const hash = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(hash(provided), hash(expected))
}

function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

function revalidateTimeline() {
  revalidatePath('/timeline')
  revalidatePath('/timeline/new')
}

function serverError(error: unknown) {
  console.error('Timeline database error', error)
  return Response.json({ error: 'Database error, check the server logs' }, { status: 500 })
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorized()

  const body = await request.json().catch(() => null)
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  const tags: string[] = Array.isArray(body?.tags)
    ? [...new Set<string>(body.tags.filter((t) => typeof t === 'string').map((t) => t.trim()))]
        .filter(Boolean)
        .slice(0, MAX_TAGS)
    : []
  if (!content) {
    return Response.json({ error: 'Content is empty' }, { status: 400 })
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return Response.json({ error: 'Content is too long' }, { status: 400 })
  }

  try {
    const note = await createNote(content, tags)
    revalidateTimeline()
    return Response.json({ note })
  } catch (error) {
    return serverError(error)
  }
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) return unauthorized()

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)
  if (!Number.isInteger(id)) {
    return Response.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    if (!(await deleteNote(id))) {
      return Response.json({ error: 'Note not found' }, { status: 404 })
    }
    revalidateTimeline()
    return Response.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
