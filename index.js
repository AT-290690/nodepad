import {
  writeFile,
  readFile,
  access,
  mkdir,
  readdir,
  unlink,
} from 'fs/promises'
import { constants, mkdirSync, rm } from 'fs'
import http from 'http'
import path from 'path'
import url from 'url'
import { randomUUID } from 'crypto'
import { fork } from 'child_process'

const runScript = (scriptPath, args, callback) => {
  let invoked = false

  let process = fork(scriptPath, args)
  process.on('error', function (err) {
    if (invoked) return
    invoked = true
    callback(err)
  })
  process.on('exit', function (code) {
    if (invoked) return
    invoked = true
    var err = code === 0 ? null : new Error('exit code ' + code)
    callback(err)
  })
}

const PORT = process.env.PORT || 8181
const directoryName = './public'

const types = {
  ttf: 'application/x-font-ttf',
  html: 'text/html',
  css: 'text/css',
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
  const characters = buffer.split('')
  const result = []
  let pointer = 0
  data.forEach((change) => {
    if (change[0] === 0) {
      for (let i = pointer; i < pointer + change[1]; i++) {
        result.push(characters[i])
      }
      pointer += change[1]
    } else if (change[0] === -1) {
      pointer += change[1]
    } else if (change[0] === 1) {
      result.push(...change[1])
    }
  })
  return result.join('')
}

const router = {
  GET: {},
  POST: {},
  DELETE: {},
}

router['GET']['/dir'] = async (req, res, { query }) => {
  const uuid = randomUUID()
  const dir = directoryName + '/portals/' + uuid
  mkdir(dir)
  res.writeHead(200, { 'Content-Type': 'application/text' })
  res.end(uuid)
}
router['GET']['/ls'] = async (req, res, { query }) => {
  const dir = directoryName + '/portals/' + query.dir
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(await readdir(dir)))
}
router['POST']['/save'] = async (req, res, { query }) => {
  const data = JSON.parse(await getReqData(req))
  const filepath = `${directoryName}/portals/${query.dir}/${query.filename}`
  await access(`${directoryName}/portals/${query.dir}/`, constants.F_OK)
    .then(async () => {
      await access(filepath, constants.F_OK)
        .then(async () => {
          const file = handleChanges(data, await readFile(filepath, 'utf-8'))
          await writeFile(filepath, file)
        })
        .catch(async () => {
          const file = handleChanges(data, '')
          await writeFile(filepath, file)
        })
    })
    .catch((err) => err)

  res.writeHead(200, { 'Content-Type': 'application/text' })
  res.end()
}
router['POST']['/exec'] = async (req, res, { query }) => {
  const filepath = `${directoryName}/portals/${query.dir}/${query.filename}`
  runScript(filepath, [`${directoryName}/portals/${query.dir}/`], (err) => {
    if (err) return console.log(err)
    console.log('finished running ' + filepath)
  })
  res.writeHead(200, { 'Content-Type': 'application/text' })
  res.end()
}
router['POST']['/disconnect'] = async (req, res, { query }) => {
  const filepath = `${directoryName}/portals/${query.dir}`
  access(filepath, constants.F_OK)
    .then(() => rm(filepath, { recursive: true }, () => {}))
    .catch((err) => console.log(err))
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end()
}
router['DELETE']['/del'] = async (req, res, { query }) => {
  const filepath = `${directoryName}/portals/${query.dir}/${query.filename}`
  access(filepath, constants.F_OK).then(() => unlink(filepath))
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end()
}
router['GET']['*'] = async (req, res, { query, pathname }) => {
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
    res.writeHead(200, { 'Content-Type': type })
    res.end(await readFile(filePath))
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/html' })
    res.end('404: File not found')
  }
}

const match = (method, pathname, req, res, params) => {
  const route = router[method][pathname]
  if (route) route(req, res, params)
}

const server = http.createServer(async (req, res) => {
  const URL = url.parse(req.url, true)
  const { query, pathname } = URL
  const params = { query, pathname }
  match(req.method, pathname, req, res, params) ??
    match('GET', '*', req, res, params)
})

server.listen(PORT, () => {
  access(root + '/portals', constants.F_OK)
    .then(async () => {
      rm(root + '/portals', { recursive: true }, (err) =>
        mkdirSync(root + '/portals', (err) => err)
      )
    })
    .catch(() => {
      mkdirSync(root + '/portals', (err) => err)
    })
  console.log(`server started on port: ${PORT}`)
})
