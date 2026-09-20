import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { isAuthed, login, logout, readToken } from './auth.ts'
import { deleteProduct, listProducts, upsertProduct } from './db.ts'
import { type Product } from '../src/data/catalog.ts'

const port = Number(process.env.PORT ?? 3001)

function send(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

function unauthorized(response: ServerResponse) {
  send(response, 401, { error: 'Sign in to edit the catalog.' })
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw) as Record<string, unknown>
}

function asProduct(body: Record<string, unknown>): Product | null {
  const id = Number(body.id)
  const name = String(body.name ?? '').trim()
  const category = Number(body.category)
  const brand = String(body.brand ?? '').trim()
  const model = String(body.model ?? '').trim()
  const spec = String(body.spec ?? '').trim()
  const image = String(body.image ?? '').trim()
  const price = Number(body.price)
  const previous = body.previousPrice === '' || body.previousPrice == null
    ? undefined
    : Number(body.previousPrice)
  const active = body.active == null ? true : Boolean(body.active)

  if (!name || !Number.isInteger(category) || category < 1 || !brand || !model || !spec || !image || !Number.isFinite(price)) return null
  if (previous !== undefined && !Number.isFinite(previous)) return null

  return {
    id: Number.isInteger(id) && id > 0 ? id : 0,
    name,
    category,
    brand,
    model,
    spec,
    price,
    previousPrice: previous,
    image: image.replace(/^\//, ''),
    active,
  }
}

const server = createServer((request, response) => {
  void handle(request, response)
})

async function handle(request: IncomingMessage, response: ServerResponse) {
  response.setHeader('Access-Control-Allow-Origin', request.headers.origin ?? '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  const url = new URL(request.url ?? '/', `http://localhost:${port}`)
  const token = readToken(request.headers.authorization)
  const method = request.method ?? 'GET'

  try {
    if (method === 'GET' && url.pathname === '/api/products') {
      send(response, 200, await listProducts())
      return
    }

    if (method === 'POST' && url.pathname === '/api/login') {
      const body = await readJson(request)
      const session = login(String(body.username ?? ''), String(body.password ?? ''))
      if (!session) {
        send(response, 401, { error: 'Wrong username or password.' })
        return
      }
      send(response, 200, { token: session })
      return
    }

    if (method === 'POST' && url.pathname === '/api/logout') {
      if (token) logout(token)
      send(response, 200, { ok: true })
      return
    }

    if (method === 'GET' && url.pathname === '/api/session') {
      send(response, 200, { ok: isAuthed(token) })
      return
    }

    if (method === 'PUT' && url.pathname === '/api/products') {
      if (!isAuthed(token)) {
        unauthorized(response)
        return
      }
      const product = asProduct(await readJson(request))
      if (!product) {
        send(response, 400, { error: 'The part is missing required fields.' })
        return
      }
      const saved = await upsertProduct(product)
      send(response, 200, saved)
      return
    }

    if (method === 'DELETE' && url.pathname.startsWith('/api/products/')) {
      if (!isAuthed(token)) {
        unauthorized(response)
        return
      }
      const id = Number(decodeURIComponent(url.pathname.slice('/api/products/'.length)))
      if (!Number.isInteger(id) || id < 1) {
        send(response, 400, { error: 'Missing id.' })
        return
      }
      await deleteProduct(id)
      send(response, 200, { ok: true })
      return
    }

    send(response, 404, { error: 'Not found' })
  } catch (error) {
    send(response, 500, { error: error instanceof Error ? error.message : 'Error' })
  }
}

server.listen(port, '127.0.0.1', () => {
  console.log(`tescgsm API on http://127.0.0.1:${port}`)
})
