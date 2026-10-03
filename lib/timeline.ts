import { neon } from '@neondatabase/serverless'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

// Timeline notes live in Postgres (Neon via the Vercel integration, which sets DATABASE_URL).
// Without DATABASE_URL (e.g. the GitHub Pages static export) the timeline is simply empty.

export interface Note {
  id: number
  content: string
  tags: string[]
  createdAt: string
}

type Sql = ReturnType<typeof neon>

let schemaReady: Promise<unknown> | null = null

function getSql(): Sql | null {
  const url = process.env.DATABASE_URL
  return url ? neon(url) : null
}

function requireSql(): Sql {
  const sql = getSql()
  if (!sql) throw new Error('DATABASE_URL is not configured')
  return sql
}

async function ensureSchema(sql: Sql) {
  schemaReady ??= sql`
    CREATE TABLE IF NOT EXISTS timeline_notes (
      id serial PRIMARY KEY,
      content text NOT NULL,
      tags text[] NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `.catch((error) => {
    schemaReady = null
    throw error
  })
  await schemaReady
}

function toNote(row: Record<string, unknown>): Note {
  return {
    id: Number(row.id),
    content: String(row.content),
    tags: (row.tags as string[]) ?? [],
    createdAt: new Date(row.created_at as string).toISOString(),
  }
}

export async function getNotes(limit?: number): Promise<Note[]> {
  const sql = getSql()
  if (!sql) return []
  await ensureSchema(sql)
  const rows = (await sql`
    SELECT id, content, tags, created_at FROM timeline_notes
    ORDER BY created_at DESC
    LIMIT ${limit ?? null}
  `) as Record<string, unknown>[]
  return rows.map(toNote)
}

export async function createNote(content: string, tags: string[]): Promise<Note> {
  const sql = requireSql()
  await ensureSchema(sql)
  const rows = (await sql`
    INSERT INTO timeline_notes (content, tags) VALUES (${content}, ${tags})
    RETURNING id, content, tags, created_at
  `) as Record<string, unknown>[]
  return toNote(rows[0])
}

export async function deleteNote(id: number): Promise<boolean> {
  const sql = requireSql()
  await ensureSchema(sql)
  const rows = (await sql`DELETE FROM timeline_notes WHERE id = ${id} RETURNING id`) as unknown[]
  return rows.length > 0
}

// remark-breaks keeps single line breaks as typed, like a social post rather than strict Markdown
const markdown = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkRehype)
  .use(rehypeStringify)

// Raw HTML in a note is dropped (remark-rehype default), so output is safe to inject
export function renderMarkdown(content: string): string {
  return String(markdown.processSync(content))
}
