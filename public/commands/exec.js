import {
  autoComplete,
  consoleEditor,
  consoleElement,
  droneButton,
  errorIcon,
  execIcon,
  keyIcon,
  xIcon,
} from '../main.js'
import { editor } from '../main.js'
import {
  run,
  printErrors,
  State,
  droneIntel,
  exe,
  API,
  matchDiff,
  changeDir,
} from './utils.js'

export const execute = async (CONSOLE) => {
  consoleElement.classList.remove('error_line')
  consoleElement.classList.add('info_line')
  const selectedConsoleLine = CONSOLE.value.trim()
  const [CMD, ...PARAMS] = selectedConsoleLine.split(' ')
  switch (CMD?.trim()?.toUpperCase()) {
    case 'CLEAR':
      State.lastSelectedFile = null
      editor.setValue('')
      consoleElement.value = ''
      droneIntel(xIcon)
      break
    case 'EMPTY':
      fetch(`${API}empty?dir=${State.dir}`, {
        method: 'DELETE',
        'Content-Type': 'application/json',
        credentials: 'same-origin',
      }).then(() => {
        droneIntel(xIcon)
        editor.setValue('')
        consoleElement.value = ''
        consoleElement.setAttribute('placeholder', `>_`)
        State.lastSelectedFile = null
        State.cache = ''
        State.fileTree = { ['']: Object.create(null) }
      })
      break
    case 'RUN':
    case '':
      run()
      break
    case 'LICENSE':
      editor.setValue(`/*
  MIT License

  Copyright (c) 2023 AT-290690
  
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:
  
  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.
  
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
  */`)
      droneIntel(keyIcon)

      break
    case '_LOG':
      {
        consoleElement.value = ''
        consoleElement.classList.add('info_line')
        consoleElement.classList.remove('error_line')
        const source = editor.getValue()
        const selection = editor.getSelection()
        if (!selection) return exe('throw new Error("Nothing is selected")')
        const formattedSelection =
          selection[selection.length - 1] === ';'
            ? selection.substring(selection, selection.length - 1)
            : selection
        const label = JSON.stringify(selection)
        const out = `${selection === '' ? ';' : ''}__debug_log(${
          formattedSelection || run()
        }, ${label})`
        editor.replaceSelection(out)
        exe(`const __debug_log = _logger(); ${editor.getValue().trim()}`)
        editor.setValue(source)
        consoleEditor.focus()
      }

      break
    case 'EXEC':
    case '>>':
    case '$':
      {
        fetch(
          `${API}exec?dir=${State.dir}&filename=${
            PARAMS[0] ?? State.lastSelectedFile ?? '_entry.js'
          }`,
          {
            method: 'POST',
            'Content-Type': 'application/json',
            credentials: 'same-origin',
          }
        )
          .then(() => {
            droneIntel(execIcon)
          })
          .catch((err) => console.log(err))
        consoleElement.value = ''
      }
      break
    case 'DIR':
      fetch(API + 'dir', { credentials: 'same-origin' })
        .then((res) => res.text())
        .then((data) => {
          consoleElement.value = ''
          State.dir = data
          State.fileTree = { ['']: Object.create(null) }
          consoleElement.setAttribute('placeholder', `>_`)
          State.lastSelectedFile = null
          State.cache = ''
          State.fileTree = { ['']: Object.create(null) }
        })
      break
    case 'LIST':
    case '..':
      {
        const sub = PARAMS[0] ?? ''
        const response = await fetch(`${API}ls?dir=${State.dir}&sub=${sub}`, {
          credentials: 'same-origin',
        })
        if (response.status !== 200) {
          droneIntel(errorIcon)
          consoleElement.classList.remove('info_line')
          consoleElement.classList.add('error_line')
          consoleElement.value = `${response.status}: ${
            response.statusText ?? 'Unauthorized'
          }`
          droneButton.classList.remove('shake')
          droneButton.classList.add('shake')
          break
        }
        const files = await response.json()
        const { cd } = changeDir(sub)
        autoComplete.innerHTML = ''
        files.forEach((file) => (cd[file] = Object.create(null)))
        consoleElement.dispatchEvent(new KeyboardEvent('input'))
      }
      break
    case 'LS':
      {
        const sub = PARAMS[0] ?? ''
        const response = await fetch(`${API}ls?dir=${State.dir}&sub=${sub}`, {
          credentials: 'same-origin',
        })
        if (response.status !== 200) {
          droneIntel(errorIcon)
          consoleElement.classList.remove('info_line')
          consoleElement.classList.add('error_line')
          consoleElement.value = `${response.status}: ${
            response.statusText ?? 'Unauthorized'
          }`
          droneButton.classList.remove('shake')
          droneButton.classList.add('shake')
          break
        }
        const files = await response.json()
        const { cd } = changeDir(sub)
        autoComplete.innerHTML = ''
        exe(
          `const __debug_log = _print();
      _print()('${State.dir}/${sub}');
      ${files
        .map((file) => {
          cd[file] = Object.create(null)
          return `__debug_log(". ${file}")`
        })
        .join('\n')}`
        )
      }
      break
    case 'ESC':
    case 'X':
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
        })
      )
      break
    case 'LOAD':
    case '.':
      {
        const filename = PARAMS[0] ?? State.lastSelectedFile ?? '_entry.js'
        const response = await fetch(`${API}portals/${State.dir}/${filename}`, {
          credentials: 'same-origin',
        })
        const data = await response.text()
        if (response.status !== 200) {
          droneIntel(errorIcon)
          consoleElement.classList.remove('info_line')
          consoleElement.classList.add('error_line')
          consoleElement.value = data
          droneButton.classList.remove('shake')
          droneButton.classList.add('shake')
          break
        }
        State.cache = data
        editor.setValue(data)
        State.lastSelectedFile = filename
        droneIntel(keyIcon)
        consoleElement.value = ''
        consoleElement.setAttribute('placeholder', `. ${filename}`)
      }
      break
    case 'DUMP':
    case '*':
      {
        consoleElement.value = ''
        const newFile = PARAMS[0]
        const filename = newFile ?? State.lastSelectedFile ?? '_entry.js'
        const source = consoleEditor
          .getValue()
          .split('\n')
          .filter((x) => !(x[0] === '/' && x[1] === '/'))
          .join('\n')
        if (newFile !== State.lastSelectedFile) State.cache = ''
        fetch(`${API}save?dir=${State.dir}&filename=${filename}`, {
          method: 'POST',
          'Content-Type': 'application/json',
          credentials: 'same-origin',
          body: JSON.stringify(matchDiff(State.cache, source)),
        }).then(() => {
          droneIntel(keyIcon)
          droneButton.classList.remove('shake')
          State.cache = source
          State.lastSelectedFile = filename
        })
      }

      break
    case 'SAVE':
    case '+':
      {
        consoleElement.value = ''
        const newFile = PARAMS[0]
        const filename = newFile ?? State.lastSelectedFile ?? '_entry.js'
        const source = editor.getValue()
        if (newFile !== State.lastSelectedFile) State.cache = ''
        fetch(`${API}save?dir=${State.dir}&filename=${filename}`, {
          method: 'POST',
          'Content-Type': 'application/json',
          credentials: 'same-origin',
          body: JSON.stringify(matchDiff(State.cache, source)),
        }).then(() => {
          droneIntel(keyIcon)
          droneButton.classList.remove('shake')
          State.cache = source
          State.lastSelectedFile = filename
          changeDir(filename)
          // const { structure } = changeDir(filename)
          // structure.pop()
          // State.currentDir = structure
          consoleElement.setAttribute('placeholder', `. ${filename}`)
        })
      }
      break
    case '++':
      State.lastSelectedFile = null
      editor.setValue('')
      consoleElement.value = ''
      execute({ value: '+ ' + PARAMS[0] ?? '' })
      break
    case 'WINDOW':
    case '#':
      if (PARAMS.length) _app(PARAMS[0]).style.background = PARAMS[1] ?? 'white'
      break
    case 'SHARE':
    case '@':
      consoleElement.value = `${API}portals/${State.dir}/${
        PARAMS[0] ?? State.lastSelectedFile ?? 'index.html'
      }`
      break
    case 'DELETE':
    case '-':
      fetch(
        `${API}del?dir=${State.dir}&filename=${
          PARAMS[0] ?? State.lastSelectedFile
        }`,
        {
          method: 'DELETE',
          'Content-Type': 'application/json',
          credentials: 'same-origin',
        }
      )
        .then(() => {
          droneIntel(xIcon)
        })
        .finally(() => {
          editor.setValue('')
          consoleElement.value = ''
          consoleElement.setAttribute('placeholder', `>_`)
          State.lastSelectedFile = null
          State.cache = ''
        })
      break

    case 'HELP':
    case '?':
      State.cache = ''
      editor.setValue(`/* 
-----------------------------
 Press on the drone - run code
 Press ctrl/command + s - run code
-----------------------------
 Enter a command in the console
 ---------[COMMANDS]---------
 HELP: list these commands
 RUN: run code 
 CLEAR: clears the editor content
 X: clears search, log and canvas pannels
 EMPTY: deletes all files in the folder
 WINDOW: open app window
 SAVE: save in starage
 LOAD: load from storage
 DELETE: remove from storage
 LIST: list folder content content
 SHARE: create a share link of a file
 DUMP: dump console output in a file
 LICENSE: read license info
 ----------------------------
*/`)
      droneIntel(keyIcon)
      consoleElement.value = ''
      break
    default:
      if (CMD.trim()) printErrors(CMD + ' does not exist!')
      else consoleElement.value = ''
      droneIntel(errorIcon)
      break
  }
}
