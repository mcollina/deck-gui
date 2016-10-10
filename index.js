'use strict'

const request = require('request')
const electron = require('electron')
const { BrowserWindow, app, dialog } = electron
const path = require('path')
require('./hotkeys')()
const icon = path.join(__dirname, '/deck.png')
var configs = [
  {
    toolbar: false,
    center: true,
    width: 480,
    height: 342,
    icon
  },
  {
    toolbar: false,
    fullscreen: true,
    icon
  }
]

app.setName('Deck')

app.commandLine.appendSwitch('enable-usermedia-screen-capturing')

app.on('ready', () => {
  app.ready = true

  app.windows = electron.screen.getAllDisplays().slice(0, 2)
    .map((display, ix) => {
      var win = new BrowserWindow(Object.assign({}, display.bounds, configs[ix]))
      return win
    })

  app.windows.forEach(win => {
    win.loadURL('file://' + path.join(__dirname, 'loading.html'))
    win.on('close', process.exit)
  })

  // FIXME nice text, probably should go into on its own file
  console.log(`
broadcast: cmd + ctrl + b
devtools: cmd + ctrl + d
pdf: cmd + ctrl + p
notes: cmd + ctrl + n
help: cmd + ctrl + h
  `)
})

if (app.dock) {
  app.dock.setIcon(icon)
}

function open (url) {
  if (!app.ready) return app.on('ready', () => open(url))

  const main = app.windows[0]

  if (!url) {
    main.loadURL('file://' + path.join(__dirname, 'open.html'))
  } else {
    request.get(url, function (err, res) {
      if (err || res.statusCode !== 200) {
        dialog.showMessageBox(main, {
          type: 'error',
          message: `Unable to open ${url}`,
          icon,
          buttons: ['OK']
        })
        return
      }
      app.windows.forEach(win => win.loadURL(url))
    })
  }
}
module.exports = open

if (require.main === module) {
  const argv = require('minimist')(process.argv.slice(2))
  const address = argv._[0]
  open(address)
}
