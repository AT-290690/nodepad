const { randomUUID } = require('crypto')

const parseCookies = (req) => {
  const cookies = {}
  if ('cookie' in req.headers)
    req.headers.cookie.split(';').forEach((cookie) => {
      const parts = cookie.split('=')
      cookies[parts[0].trim()] = (parts[1] || '').trim()
    })
  return cookies
}
const cookieRecepie = () => ({ id: randomUUID(), value: randomUUID() })
class CookieJar {
  #cookies = new Map()
  set(id, cookie) {
    if (cookie.id) {
      this.#cookies.set(id, cookie)
      setTimeout(() => {
        this.#cookies.delete(id)
        const filepath = `${directoryName}/portals/${id}`
        access(filepath, constants.F_OK)
          .then(() => rm(filepath, { recursive: true }, () => {}))
          .catch((err) => console.log(err))
      }, this.#cookies.get(id).maxAge * 1000)
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
    if (!cookie) return false
    const [id, value] = cookie.split('.')
    const current = this.get(id)
    return current && value === current.value && dir === current.id
  }
}

const cookieJar = new CookieJar()

module.exports = { cookieJar, parseCookies, cookieRecepie }
