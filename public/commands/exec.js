import {
  consoleEditor,
  consoleElement,
  errorIcon,
  formatterIcon,
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
} from './utils.js'

export const execute = async (CONSOLE) => {
  consoleElement.classList.remove('error_line')
  consoleElement.classList.add('info_line')
  const selectedConsoleLine = CONSOLE.value.trim()
  const [CMD, ...PARAMS] = selectedConsoleLine.split(' ')
  switch (CMD?.trim()?.toUpperCase()) {
    case 'CLEAR':
      State.source = editor.getValue()
      editor.setValue('')
      consoleElement.value = ''
      droneIntel(xIcon)
      break
    case 'RUN':
      run()
      consoleElement.value = ''
      break
    case 'LICENSE':
      State.source = editor.getValue()
      editor.setValue(`/*
  MIT License

  Copyright (c) 2022 AT-290690
  
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
    // case 'LINT':
    //   {
    //     const inp = PARAMS[0]?.toUpperCase()
    //     if (inp === 'OFF' && State.settings.lint) {
    //       State.settings.lint = false
    //       editor.switchInstance({
    //         lint: false,
    //         doc: editor.getValue(),
    //       })
    //       droneIntel(xIcon)
    //     } else if (inp === 'ON' && !State.settings.lint) {
    //       execute({ value: 'UNVEIL' }).then(() => {
    //         droneIntel(formatterIcon)
    //         debug()
    //       })
    //     } else if (!inp) consoleElement.value = 'Provide a lint option on/off'
    //     else
    //       consoleElement.value = 'LINT ' + (State.settings.lint ? 'OFF' : 'ON')
    //   }
    //   break
    case 'DIR':
      fetch(API + 'dir')
        .then((res) => res.text())
        .then((data) => {
          State.dir = data
        })
      break
    case 'LIST':
    case '/':
      fetch(`${API}ls?dir=${State.dir}`)
        .then((d) => d.json())
        .then((files) => {
          editor.setValue(`${State.dir}\n${files.join('\n')}`)
          consoleElement.value = ''
          droneIntel(keyIcon)
          State.lastSelectedFile = null
        })
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
        State.source = editor.getValue()
        const file = PARAMS[0]
        fetch(`${API}portals/${State.dir}/${file}`)
          .then((res) => res.text())
          .then((data) => {
            State.cache = data
            editor.setValue(data)
          })
          .then(() => {
            State.lastSelectedFile = file
            droneIntel(keyIcon)
            consoleElement.value = ''
          })
      }
      break
    case 'SAVE':
    case '>':
      {
        consoleElement.value = ''
        const filename = PARAMS[0] ? PARAMS[0] : State.lastSelectedFile
        const source = editor.getValue()
        fetch(`${API}save?dir=${State.dir}&filename=${filename}`, {
          method: 'POST',
          contentType: 'application/json',
          body: JSON.stringify(matchDiff(State.cache, source)),
        })
          .then(() => {
            // localStorage.setItem(file, editor.getValue())
            droneIntel(keyIcon)
          })
          .finally(() => {
            State.cache = source
          })
      }
      break
    case 'DELETE':
      fetch(
        `${API}del?dir=${State.dir}&filename=${
          PARAMS[0] ?? State.lastSelectedFile
        }`,
        {
          method: 'DELETE',
          contentType: 'application/json',
        }
      )
        .then(() => {
          droneIntel(xIcon)
        })
        .finally(() => {
          editor.setValue('')
          consoleElement.value = ''
        })
      break
    case 'PRETTY':
      editor.setValue(js_beautify(editor.getValue(), State.settings.beautify))
      droneIntel(formatterIcon)
      break
    case 'EXEC':
      fetch(`${API}exec?dir=${State.dir}&filename=${PARAMS[0]}`, {
        method: 'POST',
        contentType: 'application/json',
        // body: editor.getValue(),
      })
        // .then((data) => data.text())
        .then((data) => {
          droneIntel(keyIcon)
          // editor.setValue(data)
        })
        .catch((err) => console.log(err))
      consoleElement.value = ''

      break
    case 'BACK':
      editor.setValue(State.source)
      droneIntel(keyIcon)
      consoleElement.value = ''
      break
    case 'HELP':
      State.source = editor.getValue()
      editor.setValue(`/* 
-----------------------------
 Press on the drone - run code
 Press ctrl/command + s - run code
-----------------------------
 Enter a command in the console
 ---------[COMMANDS]---------
 BACK: go back to the code
 HELP: list these commands
 RUN: run code 
 CLEAR: clears the editor content
 X: clears search, log and canvas pannels
 SAVE: save in starage
 LOAD: load from storage
 DELETE: remove from storage
 LIST: list stash content
 PRETTY: format code
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
