/**
 * POST /api/trigger-agenda-claude
 * Triggers the GitHub Actions workflow via workflow_dispatch.
 * Uses GH_WORKFLOW_TOKEN stored as a Vercel environment variable.
 */

const GH_REPO = 'ramonesps/meu-site'
const GH_WORKFLOW = 'agenda-claude-daily.yml'

export async function POST() {
  const token = process.env.GH_WORKFLOW_TOKEN
  if (!token) {
    return Response.json({ error: 'GH_WORKFLOW_TOKEN not configured.' }, { status: 503 })
  }

  const res = await fetch(
    `https://api.github.com/repos/${GH_REPO}/actions/workflows/${GH_WORKFLOW}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  )

  if (res.status === 204) return Response.json({ ok: true })
  const body = await res.json().catch(() => ({}))
  return Response.json({ error: body.message || `GitHub returned ${res.status}` }, { status: res.status })
}
