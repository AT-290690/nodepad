const http = require('http')
const { access } = require('fs/promises')
const { constants, mkdirSync, rm } = require('fs')
const url = require('url')
const { parseCookies } = require('./utils/cookies.js')
const { router, match, root } = require('./utils/routes.js')
const PORT = process.env.PORT ?? 8181
const server = http.createServer(async (req, res) => {
  const URL = url.parse(req.url, true)
  const { query, pathname } = URL
  const key = `${req.method} ${pathname}`
  if (key in router) {
    const { _portal } = parseCookies(req)
    match(key, req, res, {
      query,
      pathname,
      cookie: _portal,
    })
  } else match('GET *', req, res, { pathname })
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
