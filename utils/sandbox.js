const vm = require('vm')
const { exec } = require('child_process')
const { readFile, writeFile, rm, mkdir } = require('fs/promises')
const sanitizePath = (path) => path.replaceAll('../', '')

process.on('message', async ({ script, dir }) => {
  const sandbox = {
    read: (path) => readFile(dir + sanitizePath(path), 'utf-8'),
    write: (path, data) => writeFile(dir + sanitizePath(path), data),
    remove: (path) => rm(dir + sanitizePath(path), { recursive: true }),
    clear: () => rm(dir, { recursive: true }).then(() => mkdir(dir)),
    clone: (repo, path = '') =>
      exec(
        `git clone ${repo}`,
        {
          stdio: [0, 1, 2],
          cwd: dir + sanitizePath(path),
        },
        (err) => err && console.log(err)
      ),
    install: (folder = '', package = '') =>
      exec(`npm install --prefix ${dir}${folder} ${package}`, {
        stdio: [0, 1, 2],
      }),
    run: (folder = '', script = '') =>
      exec(`npm run --prefix ${dir}${folder} ${script}`, {
        stdio: [0, 1, 2],
      }),
  }
  try {
    vm.runInNewContext(script, sandbox)
    await sandbox?.entry()
  } catch (err) {}
})
