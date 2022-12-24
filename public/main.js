import { CodeMirror } from './libs/editor/editor.bundle.js'
import { execute } from './commands/exec.js'
import { API, run, State } from './commands/utils.js'
export const consoleElement = document.getElementById('console')
export const editorContainer = document.getElementById('editor-container')
export const mainContainer = document.getElementById('main-container')
export const headerContainer = document.getElementById('header')
export const focusButton = document.getElementById('focus-button')
export const keyButton = document.getElementById('key')
export const appButton = document.getElementById('app-settings')
export const droneButton = document.getElementById('drone')
export const errorIcon = document.getElementById('error-drone-icon')
export const formatterIcon = document.getElementById('formatter-drone-icon')
export const keyIcon = document.getElementById('key-drone-icon')
export const xIcon = document.getElementById('x-drone-icon')
export const formatterButton = document.getElementById('formatter')
export const popupContainer = document.getElementById('popup-container')
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
appButton.addEventListener('click', () => {
  execute({ value: 'EXEC' })
  // execute({ value: 'INPUT ' + consoleElement.value })
})
formatterButton.addEventListener('click', () => {
  execute({ value: 'PRETTY' })
})
keyButton.addEventListener('click', () => execute({ value: 'LIST' }))
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
    editor.getSelection() ? execute({ value: '_LOG' }) : run()
  } else if (e.key === 'Enter') {
    if (activeElement === consoleElement) {
      execute(consoleElement)
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    popupContainer.style.display = 'none'
    applicationContainer.style.display = 'none'
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
const unloadSupportHandler = () => {
  if (unloadSupportHandler._hasUnloaded) return
  unloadSupportHandler._hasUnloaded = true
  navigator.sendBeacon(`${API}disconnect?dir=${State.dir}`)
}
window.addEventListener('pagehide', unloadSupportHandler)
window.addEventListener('unload', unloadSupportHandler)
const bounds = document.body.getBoundingClientRect()
editor.setSize(bounds.width - 10, bounds.height - 60)
consoleElement.setAttribute('placeholder', 'enter HELP')
execute({ value: 'DIR' })
