const vm = require('vm')
const { readFile, writeFile } = require('fs/promises')
process.on('message', async ({ script, dir }) => {
  const sandbox = {
    read: (path) => readFile(dir + path.replaceAll('../', ''), 'utf-8'),
    write: (path, data) => writeFile(dir + path.replaceAll('../', ''), data),
  }
  vm.runInNewContext(script, sandbox)
  const result = await (sandbox?.result() ?? '')
  process.send(result.toString())
})
