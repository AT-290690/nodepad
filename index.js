const {
  writeFile,
  readFile,
  access,
  mkdir,
  readdir,
  unlink,
} = require('fs/promises')
const { constants, mkdirSync, rm } = require('fs')
const http = require('http')
const path = require('path')
const url = require('url')
const { randomUUID } = require('crypto')
const { fork } = require('child_process')
const { brotliCompress } = require('zlib')

const cookieRecepie = () => ({ id: randomUUID(), value: randomUUID() })
class CookieJar {
  #cookies = new Map()
  set(id, cookie) {
    if (cookie.id) {
      this.#cookies.set(id, cookie)
      setTimeout(
        () => this.#cookies.delete(id),
        this.#cookies.get(id).maxAge * 1000
      )
    }
  }
  get(id) {
    return this.#cookies.get(id)
  }
  destroy(id) {
    this.#cookies.delete(id)
  }
  keys() {
    return this.#cookies.keys()
  }
  values() {
    return [...this.#cookies.values()]
  }
  isCookieVerified(cookie, dir) {
    if (!Array.isArray(cookie)) return false
    const [id, value] = cookie
    const current = this.get(id)
    return current && value === current.value && dir === current.id
  }
}

const cookieJar = new CookieJar()

const runScript = async (scriptPath, dir, callback) => {
  const child = fork('./sandbox.js')
  const script = await readFile(scriptPath, 'utf-8')
  child.send({ script, dir })
  child.on('message', (result) => callback(result))
  child.on('error', (error) => {
    console.error(`Error: ${error.message}`)
  })
}

const PORT = process.env.PORT || 8181
const directoryName = './public'

const types = {
  ttf: 'application/x-font-ttf',
  html: 'text/html',
  css: 'text/css',
  less: 'text/css',
  js: 'application/javascript',
  png: 'image/png',
  svg: 'image/svg+xml',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  json: 'application/json',
  text: 'application/text',
  txt: 'application/text',
  xml: 'application/xml',
}

const root = path.normalize(path.resolve(directoryName))
const getReqData = (req) =>
  new Promise((resolve, reject) => {
    try {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })
      req.on('end', () => {
        resolve(body)
      })
    } catch (error) {
      reject(error)
    }
  })

const handleChanges = (data = [], buffer = '') => {
  let pointer = 0
  return data.reduce((result, change) => {
    if (change[0] === 0) {
      for (let i = pointer; i < pointer + change[1]; ++i) result += buffer[i]
      pointer += change[1]
    } else if (change[0] === -1) pointer += change[1]
    else if (change[0] === 1) result += change[1]
    return result
  }, '')
}

const router = {
  GET: {},
  POST: {},
  PUT: {},
  DELETE: {},
}
router['GET']['/dir'] = async (req, res) => {
  const creds = cookieRecepie()
  const dir = directoryName + '/portals/' + creds.id
  const maxAge = 60 * 30
  const cookie = {
    id: creds.id,
    value: creds.value,
    maxAge,
  }
  mkdir(dir)
  cookieJar.set(creds.id, cookie)
  res.writeHead(200, {
    'Content-Type': 'application/text',
    'Set-Cookie': `Value=${creds.id}.${creds.value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Strict; Secure`,
  })
  res.end(creds.id)
}
router['POST']['/exec'] = async (req, res, { query, cookie }) => {
  if (!cookieJar.isCookieVerified(cookie, query.dir)) {
    res.writeHead(403, { 'Content-Type': 'text/html' })
    res.end('403: Unauthorized!')
    return
  }
  const dir = `${directoryName}/portals/${query.dir}/`
  const filepath = `${dir}${query.filename}`
  runScript(filepath, dir, (result) => {
    res.writeHead(200, { 'Content-Type': 'application/text' })
    res.end(result)
  })
}
router['GET']['/ls'] = async (req, res, { query, cookie }) => {
  if (!cookieJar.isCookieVerified(cookie, query.dir)) {
    res.writeHead(403, { 'Content-Type': 'text/html' })
    res.end('403: Unauthorized!')
    return
  }
  const dir = directoryName + '/portals/' + query.dir + '/'
  await access(dir, constants.F_OK)
    .then(async () => {
      const list = await readdir(dir)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(list))
    })
    .catch((err) => {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end('[]')
    })
}
router['POST']['/save'] = async (req, res, { query, cookie }) => {
  if (!cookieJar.isCookieVerified(cookie, query.dir)) {
    res.writeHead(403, { 'Content-Type': 'text/html' })
    res.end('403: Unauthorized!')
    return
  }
  const data = JSON.parse(await getReqData(req))
  const dir = `${directoryName}/portals/${query.dir}/`
  const filepath = `${dir}${query.filename}`
  await access(dir, constants.F_OK)
    .then(async () => {
      await access(filepath, constants.F_OK)
        .then(async () => {
          const buffer = await readFile(filepath, 'utf-8')
          const file = handleChanges(data, buffer)
          writeFile(filepath, file)
        })
        .catch(async () => {
          const file = handleChanges(data, '')
          const folders = query.filename.split('/')
          folders.pop()
          if (folders.length)
            await mkdir(`${dir}/${folders.join('/')}`, { recursive: true })

          await writeFile(filepath, file)
        })
    })
    .catch((err) => err)

  res.writeHead(200, { 'Content-Type': 'application/text' })
  res.end()
}

router['POST']['/disconnect'] = async (req, res, { query, cookie }) => {
  if (!cookieJar.isCookieVerified(cookie, query.dir)) {
    res.writeHead(403, { 'Content-Type': 'text/html' })
    res.end('403: Unauthorized!')
    return
  }
  const filepath = `${directoryName}/portals/${query.dir}`
  access(filepath, constants.F_OK)
    .then(() => rm(filepath, { recursive: true }, () => {}))
    .catch((err) => console.log(err))
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end()
}
router['DELETE']['/del'] = async (req, res, { query, cookie }) => {
  if (!cookieJar.isCookieVerified(cookie, query.dir)) {
    res.writeHead(403, { 'Content-Type': 'text/html' })
    res.end('403: Unauthorized!')
    return
  }
  const filepath = `${directoryName}/portals/${query.dir}/${query.filename}`
  access(filepath, constants.F_OK)
    .then(() => {
      unlink(filepath)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end()
    })
    .catch((err) => {
      res.writeHead(404, { 'Content-Type': 'text/html' })
      res.end('404: File not Found')
    })
}
router['DELETE']['/empty'] = async (req, res, { query, cookie }) => {
  if (!cookieJar.isCookieVerified(cookie, query.dir)) {
    res.writeHead(403, { 'Content-Type': 'text/html' })
    res.end('403: Unauthorized!')
    return
  }
  const dir = `${directoryName}/portals/${query.dir}/`
  access(dir, constants.F_OK).then(() =>
    rm(dir, { recursive: true }, () => mkdir(dir))
  )
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end()
}
router['GET']['*'] = async (req, res, { pathname }) => {
  const extension = path.extname(req.url).slice(1)
  const type = extension ? types[extension] : types.html
  const supportedExtension = Boolean(type)

  if (!supportedExtension) {
    res.writeHead(404, { 'Content-Type': 'text/html' })
    res.end('405: Unsupported file format')
    return
  }

  let fileName = pathname
  if (req.url === '/') {
    fileName = 'index.html'
  }
  const filePath = path.join(root, fileName)
  const isPathUnderRoot = path
    .normalize(path.resolve(filePath))
    .startsWith(root)
  if (!isPathUnderRoot) {
    res.writeHead(404, { 'Content-Type': 'text/html' })
    res.end('404: File not found')
    return
  }
  try {
    res.writeHead(200, { 'Content-Type': type, 'Content-Encoding': 'br' })
    brotliCompress(await readFile(filePath), {}, (error, buffer) =>
      error ? console.log(error) : res.end(buffer)
    )
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/html' })
    res.end('404: File not found')
  }
}

const match = (method, pathname, req, res, params) => {
  const route = router[method][pathname]
  if (route) {
    route(req, res, params)
    return true
  }
}

const server = http.createServer(async (req, res) => {
  const URL = url.parse(req.url, true)
  const { query, pathname } = URL
  const cookie = req.headers.cookie?.split('Value=')[1].split('.')
  match(req.method, pathname, req, res, {
    query,
    pathname,
    cookie,
  }) ?? match('GET', '*', req, res, { pathname })
})

server.listen(PORT, () =>
  access(root + '/portals', constants.F_OK)
    .then(async () =>
      rm(root + '/portals', { recursive: true }, (err) =>
        mkdirSync(root + '/portals', (err) => err)
      )
    )
    .catch(() => mkdirSync(root + '/portals', (err) => err))
    .finally(() => console.log(`server started on port: ${PORT}`))
)
