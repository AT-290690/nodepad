import {
  droneButton,
  editor,
  formatterIcon,
  consoleElement,
  // alertIcon,
  errorIcon,
  popupContainer,
  consoleEditor,
  applicationContainer,
} from '../main.js'
export const print = function (...values) {
  values.forEach(
    (x) => (consoleElement.value += `${JSON.stringify(x) ?? undefined}`)
  )
  return values
}
export const API = location.protocol + '//' + location.host + '/'

export const createCanvas = () => {
  applicationContainer.innerHTML = ''
  applicationContainer.style.display = 'block'
  const canvas = document.createElement('canvas')
  applicationContainer.appendChild(canvas)
  return canvas
}
export const createApp = () => {
  applicationContainer.innerHTML = ''
  applicationContainer.style.display = 'block'
  const app = document.createElement('iframe')
  applicationContainer.appendChild(app)
  return app
}
export const printErrors = (errors) => {
  consoleElement.classList.remove('info_line')
  consoleElement.classList.add('error_line')
  consoleElement.value = errors
}

export const correctFilePath = (filename) => {
  if (!filename) return ''
  return '/' + filename.split('/').filter(Boolean).join('/')
}
export const State = {
  activeWindow: null,
  isErrored: true,
  input: '',
  cache: '',
  settings: {
    lint: false,
    beautify: {
      indent_size: '2',
      indent_char: ' ',
      max_preserve_newlines: '-1',
      preserve_newlines: false,
      keep_array_indentation: true,
      break_chained_methods: true,
      indent_scripts: 'keep',
      brace_style: 'none,preserve-inline',
      space_before_conditional: true,
      unescape_strings: false,
      jslint_happy: true,
      end_with_newline: false,
      wrap_line_length: '80',
      indent_inner_html: false,
      comma_first: false,
      e4x: true,
      indent_empty_lines: false,
    },
  },
}

export const droneIntel = (icon) => {
  icon.style.visibility = 'visible'
  setTimeout(() => (icon.style.visibility = 'hidden'), 500)
}

const AsyncFunction = async function () {}.constructor
export const exe = async (source, params) => {
  try {
    const result = await new AsyncFunction(`${State.input};${source}`)()
    droneButton.classList.remove('shake')
    droneIntel(formatterIcon)
    return result
  } catch (err) {
    consoleElement.classList.remove('info_line')
    consoleElement.classList.add('error_line')
    consoleElement.value = consoleElement.value.trim() || err + ' '
    droneButton.classList.remove('shake')
    droneButton.classList.add('shake')
    droneIntel(errorIcon)
  }
}

globalThis._logger = (disable = 0) => {
  if (disable) return () => {}
  popupContainer.style.display = 'block'
  const popup = consoleEditor
  popup.setValue('')
  const bouds = document.body.getBoundingClientRect()
  const width = bouds.width
  const height = bouds.height
  popup.setSize(width - 2, height / 3)
  // let count = 0
  return (msg, comment = '', space) => {
    const current = popup.getValue()
    popup.setValue(
      `${current ? current + '\n' : ''}// ${comment}
${msg !== undefined ? JSON.stringify(msg, null, space) : undefined}`
    )
    popup.setCursor(
      popup.posToOffset({ ch: 0, line: popup.lineCount() - 1 }),
      true
    )
    return msg
  }
}
globalThis._print = (disable = 0) => {
  if (disable) return () => {}
  popupContainer.style.display = 'block'
  const popup = consoleEditor
  popup.setValue('')
  const bouds = document.body.getBoundingClientRect()
  const width = bouds.width
  const height = bouds.height
  popup.setSize(width - 2, height / 3)
  return (msg) => {
    const current = popup.getValue()
    popup.setValue(
      `${current ? current + '\n' : ''}${msg
        .toString()
        .replace('"', '')
        .replace("'", '')
        .trim()}`
    )
    popup.setCursor(
      popup.posToOffset({ ch: 0, line: popup.lineCount() - 1 }),
      true
    )
    return msg
  }
}
globalThis._read = async (file) =>
  await (await fetch(`${API}/portals/${State.dir}/${file}`)).text()

globalThis._canvas = (w, h) => {
  const canvas = createCanvas()
  if (!(w ?? h)) {
    const bounds = document.body.getBoundingClientRect()
    canvas.width = (w ?? bounds.width) / 2
    canvas.height = (h ?? bounds.height) - 65
  }
  return canvas
}
globalThis._app = (url) => {
  const app = createApp()
  const bounds = document.body.getBoundingClientRect()
  app.width = bounds.width / 2
  app.height = bounds.height - 65
  app.setAttribute('src', url)
  return app
}
export const run = async () => {
  consoleElement.classList.add('info_line')
  consoleElement.classList.remove('error_line')
  consoleElement.value = ''
  popupContainer.style.display = 'none'
  const source = (State.source = editor.getValue())
  await exe(source.trim())
  return source
}
const dmp = new diff_match_patch()
export const applyDiff = (data = [], buffer = '') => {
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
export const matchDiff = (a, b) => {
  const diff = []
  const diff_obj = dmp.diff_main(a, b, true)
  for (const change in diff_obj) {
    if (diff_obj[change][0] === 0 || diff_obj[change][0] === -1)
      diff_obj[change][1] = diff_obj[change][1].length
    diff.push([diff_obj[change][0], diff_obj[change][1]])
  }
  return diff_obj
}
