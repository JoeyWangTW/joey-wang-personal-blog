import { createHash, timingSafeEqual } from 'crypto'

// Posting a note commits a markdown file to the repo; the push triggers a redeploy.
// Required env: TIMELINE_ADMIN_PASSWORD, GITHUB_TOKEN (contents: write on this repo).
// Optional env: GITHUB_REPO (owner/name), GITHUB_BRANCH.
const REPO = process.env.GITHUB_REPO || 'JoeyWangTW/joey-wang-personal-blog'
const BRANCH = process.env.GITHUB_BRANCH || 'main'
const MAX_CONTENT_LENGTH = 10000
const MAX_TAGS = 10

function isAuthorized(request: Request) {
  const expected = process.env.TIMELINE_ADMIN_PASSWORD
  const provided = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!expected || !provided) return false
  const hash = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(hash(provided), hash(expected))
}

function fileNameFor(date: Date) {
  // 2026-10-02T15:04:05.123Z -> 2026-10-02-150405
  const [day, time] = date.toISOString().split('T')
  return `${day}-${time.slice(0, 8).replace(/:/g, '')}`
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.GITHUB_TOKEN) {
    return Response.json({ error: 'GITHUB_TOKEN is not configured' }, { status: 500 })
  }

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

  const now = new Date()
  const slug = fileNameFor(now)
  const path = `data/timeline/${slug}.md`
  // JSON strings are valid YAML, so this keeps arbitrary tag text safe in front matter
  const file = [
    '---',
    `date: ${JSON.stringify(now.toISOString())}`,
    `tags: ${JSON.stringify(tags)}`,
    '---',
    '',
    content,
    '',
  ].join('\n')

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      message: `timeline: add note ${slug}`,
      content: Buffer.from(file, 'utf8').toString('base64'),
      branch: BRANCH,
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    console.error('GitHub commit failed', res.status, detail)
    return Response.json({ error: `GitHub API returned ${res.status}` }, { status: 502 })
  }

  const result = await res.json()
  return Response.json({ slug, commitUrl: result.commit?.html_url })
}
