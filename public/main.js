import { CodeMirror } from './libs/editor/editor.bundle.js'
import { execute } from './commands/exec.js'
import { API, checkDir, run, State } from './commands/utils.js'
export const consoleElement = document.getElementById('console')
export const editorContainer = document.getElementById('editor-container')
export const mainContainer = document.getElementById('main-container')
export const headerContainer = document.getElementById('header')
// export const keyButton = document.getElementById('key')
// export const appButton = document.getElementById('app-settings')
// export const formatterButton = document.getElementById('formatter')
export const droneButton = document.getElementById('drone')
export const errorIcon = document.getElementById('error-drone-icon')
export const execIcon = document.getElementById('exec-drone-icon')
export const formatterIcon = document.getElementById('formatter-drone-icon')
export const keyIcon = document.getElementById('key-drone-icon')
export const xIcon = document.getElementById('x-drone-icon')
export const popupContainer = document.getElementById('popup-container')
export const autoComplete = document.getElementById('autocomplete-container')
export const applicationContainer = document.getElementById(
  'application-container'
)

export const compositionContainer = document.getElementById(
  'composition-container'
)
export const editorResizerElement = document.getElementById('editor-resizer')
export const consoleResizerElement = document.getElementById('console-resizer')

export const consoleEditor = CodeMirror(popupContainer)

droneButton.addEventListener('click', () => execute({ value: '_LOG' }))
// appButton.addEventListener('click', () => {
//   execute({ value: 'EXEC' })
// })
// formatterButton.addEventListener('click', () => {
//   execute({ value: 'PRETTY' })
// })
// keyButton.addEventListener('click', () => execute({ value: 'LIST' }))
export const editor = CodeMirror(editorContainer, {})
editorContainer.addEventListener(
  'click',
  () => (State.activeWindow = editorContainer)
)
document.addEventListener('keydown', (e) => {
  const activeElement = document.activeElement
  if (e.key && e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey)) {
    e = e || window.event
    e.preventDefault()
    e.stopPropagation()
    popupContainer.style.display = 'none'
    consoleElement.value = ''
    // const value = js_beautify(editor.getValue(), State.settings.beautify)
    // editor.setValue(value)
    // editor.getSelection() ? execute({ value: '_LOG' }) : run()
    execute({ value: 'SAVE' })
  } else if (e.key === 'Enter') {
    if (activeElement === consoleElement) {
      execute(consoleElement)
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    popupContainer.style.display = 'none'
    applicationContainer.style.display = 'none'
    autoComplete.innerHTML = ''
  }
})
State.activeWindow = editorContainer
editor.focus()
window.addEventListener('resize', () => {
  const bouds = document.body.getBoundingClientRect()
  const width = bouds.width
  const height = bouds.height
  editor.setSize(width - 10, height - 60)
  // editor.setSize(width, height - 70)
  if (popupContainer.style.display === 'block') {
    consoleEditor.setSize(width - 2, height / 3)
  }
  if (applicationContainer.style.display === 'block') {
    applicationContainer.style.display = 'none'
  }
})
window.addEventListener(
  'beforeunload',
  (e) =>
    (e.returnValue = `Before leaving make sure you save your work (if it's worth)`)
)

consoleElement.addEventListener('input', (e) => {
  const current = e.currentTarget.value
  if (current[0] === '.' && current[1] === '.') {
    autoComplete.style.display = 'none'
    autoComplete.innerHTML = ''
    if (
      current[current.length - 1] === '/' ||
      current[current.length - 1] === ' '
    ) {
      const {
        cd: { size, filename, dir, ...cd },
        structure,
      } = checkDir(current.split('.. ')[1])
      const fragment = document.createDocumentFragment()
      delete cd['']
      // delete cd['size']
      // delete cd['filename']
      // delete cd['dir']
      if (Object.keys(cd).length) {
        for (const f in cd) {
          const option = document.createElement('button')
          const file = cd[f]
          option.textContent = ` ${file.filename} | size: ${(
            file.size / 1024
          ).toFixed(1)} kb type: ${file.dir ? 'dir' : 'file'}`
          option.addEventListener('click', () => {
            if (file.dir) consoleElement.value = `.. ${structure.join('/')}${f}`
            else consoleElement.value = `. ${structure.join('/')}${f}`
            option.parentNode.removeChild(option)
            autoComplete.style.display = 'none'
            autoComplete.innerHTML = ''
            consoleElement.focus()
          })
          option.classList.add('fs-autocomplete-option')
          fragment.appendChild(option)
        }
        autoComplete.style.display = 'grid'
        autoComplete.appendChild(fragment)
      }
    }
  }
})
const unloadSupportHandler = () => {
  if (unloadSupportHandler._hasUnloaded) return
  unloadSupportHandler._hasUnloaded = true
  navigator.sendBeacon(`${API}disconnect?dir=${State.dir}`)
}
window.addEventListener('pagehide', unloadSupportHandler)
window.addEventListener('unload', unloadSupportHandler)
const bounds = document.body.getBoundingClientRect()
editor.setSize(bounds.width - 10, bounds.height - 60)
consoleElement.setAttribute('placeholder', '>_')
execute({ value: 'DIR' })
