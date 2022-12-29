const {
  writeFile,
  readFile,
  access,
  mkdir,
  readdir,
  lstat,
} = require('fs/promises')
const { constants, rm } = require('fs')
const { brotliCompress } = require('zlib')
const path = require('path')
const { run } = require('./threads.js')
const { cookieJar, cookieRecepie } = require('./cookies.js')
const directoryName = './public'
const root = path.normalize(path.resolve(directoryName))

const compress = (data) =>
  new Promise((resolve, reject) =>
    brotliCompress(data, (error, buffer) =>
      error ? reject(error) : resolve(buffer)
    )
  )

const types = {
  md: 'application/text',
  ttf: 'application/x-font-ttf',
  otf: 'application/x-font-otf',
  wasm: 'application/wasm',
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
const sanitizePath = (path) => path.replaceAll('../', '')
router['GET /dir'] = async (req, res) => {
  const creds = cookieRecepie()
  const dir = directoryName + '/portals/' + creds.id
  const maxAge = 60 * 60 * 4
  const cookie = {
    id: creds.id,
    value: creds.value,
    maxAge,
  }
  mkdir(dir)
  cookieJar.set(creds.id, cookie)
  res.writeHead(200, {
    'Content-Type': 'application/text',
    'Set-Cookie': `_portal=${creds.id}.${creds.value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Strict; Secure`,
  })
  res.end(creds.id)
}
router['POST /exec'] = async (req, res, { query, cookie }) => {
  if (!cookieJar.isCookieVerified(cookie, query.dir)) {
    res.writeHead(403, { 'Content-Type': 'text/html' })
    res.end('403: Unauthorized!')
    return
  }
  const dir = `${directoryName}/portals/${query.dir}/`
  const filepath = `${dir}${sanitizePath(query.filename)}`
  try {
    await access(filepath, constants.F_OK)
    await run(filepath, dir)
    res.writeHead(200, { 'Content-Type': 'application/text' })
    res.end()
  } catch (err) {
    console.log(err)
    res.writeHead(404, { 'Content-Type': 'application/text' })
    res.end()
  }
}
router['GET /ls'] = async (req, res, { query, cookie }) => {
  if (!cookieJar.isCookieVerified(cookie, query.dir)) {
    res.writeHead(403, { 'Content-Type': 'text/html' })
    res.end('403: Unauthorized!')
    return
  }
  const dir =
    directoryName + '/portals/' + query.dir + '/' + sanitizePath(query.sub)
  try {
    await access(dir, constants.F_OK)
    if ((await lstat(dir)).isDirectory()) {
      const list = await readdir(dir)
      const stats = (
        await Promise.all(list.map((x) => lstat(`${dir}/${x}`)))
      ).map((x) => ({ dir: x.isDirectory(), size: x.size }))
      const listWithStats = list.reduce((acc, filename, index) => {
        acc.push({ filename, ...stats[index] })
        return acc
      }, [])
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(listWithStats))
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end('[]')
    }
  } catch (err) {
    console.log(err)
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end('[]')
  }
}
router['POST /save'] = async (req, res, { query, cookie }) => {
  if (!cookieJar.isCookieVerified(cookie, query.dir)) {
    res.writeHead(403, { 'Content-Type': 'text/html' })
    res.end('403: Unauthorized!')
    return
  }
  const data = JSON.parse(await getReqData(req))
  const dir = `${directoryName}/portals/${query.dir}/`
  const filepath = `${dir}${sanitizePath(query.filename)}`
  try {
    if (
      (await access(dir, constants.F_OK)) &&
      (await access(filepath, constants.F_OK))
    ) {
      const buffer = await readFile(filepath, 'utf-8')
      const file = handleChanges(data, buffer)
      writeFile(filepath, file)
    } else {
      const file = handleChanges(data, '')
      const folders = query.filename.split('/')
      folders.pop()
      if (folders.length)
        await mkdir(`${dir}/${folders.join('/')}`, { recursive: true })
      await writeFile(filepath, file)
    }
    res.writeHead(200, { 'Content-Type': 'application/text' })
    res.end()
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/text' })
    res.end()
  }
}

router['POST /disconnect'] = async (req, res, { query, cookie }) => {
  if (!cookieJar.isCookieVerified(cookie, query.dir)) {
    res.writeHead(403, { 'Content-Type': 'text/html' })
    res.end('403: Unauthorized!')
    return
  }
  const filepath = `${directoryName}/portals/${query.dir}`
  try {
    await access(filepath, constants.F_OK)
    rm(filepath, { recursive: true }, () => {})
  } catch (err) {}
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end()
}
router['DELETE /del'] = async (req, res, { query, cookie }) => {
  if (!cookieJar.isCookieVerified(cookie, query.dir)) {
    res.writeHead(403, { 'Content-Type': 'text/html' })
    res.end('403: Unauthorized!')
    return
  }
  const filepath = `${directoryName}/portals/${query.dir}/${sanitizePath(
    query.filename
  )}`
  try {
    await access(filepath, constants.F_OK)
    rm(filepath, { recursive: true }, (err) => err && console.log(err))
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end()
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/html' })
    res.end('404: File not Found')
  }
}
router['DELETE /empty'] = async (req, res, { query, cookie }) => {
  if (!cookieJar.isCookieVerified(cookie, query.dir)) {
    res.writeHead(403, { 'Content-Type': 'text/html' })
    res.end('403: Unauthorized!')
    return
  }
  const dir = `${directoryName}/portals/${query.dir}/`
  try {
    await access(dir, constants.F_OK)
    rm(dir, { recursive: true }, () => mkdir(dir))
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end()
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end()
  }
}
router['GET *'] = async (req, res, { pathname }) => {
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
    res.end(await compress(await readFile(filePath)))
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/html' })
    res.end('404: File not found')
  }
}

const match = (key, req, res, params) => {
  const route = router[key]
  route(req, res, params)
  return true
}
module.exports = { match, root, router }
