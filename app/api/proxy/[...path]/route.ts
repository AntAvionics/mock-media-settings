/* ------------------------------------------------------------------ */
/*  Catch-all proxy: /api/proxy/* -> Flask backend                     */
/* ------------------------------------------------------------------ */

const FLASK_URL =
  process.env.FLASK_API_URL?.replace(/\/+$/, "") ?? "http://localhost:9001"

async function handler(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const target = `${FLASK_URL}/${path.join("/")}`

  const url = new URL(req.url)
  const qs = url.search

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text()
  }

  try {
    const upstream = await fetch(`${target}${qs}`, init)
    const body = await upstream.text()

    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Backend unavailable",
        detail: String(err),
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    )
  }
}

export const GET = handler
export const POST = handler
export const PATCH = handler
export const PUT = handler
export const DELETE = handler
