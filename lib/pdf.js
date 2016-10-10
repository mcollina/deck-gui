'use strict'

const {app, BrowserWindow} = require('electron')
const path = require('path')
const Pdf = require('pdfkit')

module.exports = () => {
  if (process.capture) { return }

  var pdfWin = new BrowserWindow({
    toolbar: false,
    center: true,
    width: 987,
    height: 680,
    'web-preferences': {
      preload: path.join(__dirname, '/pdf-preload.js')
    },
    show: false
  })
  var win = app.windows[0]
  var url = win.getUrl()
  var doc = makePdf()

  if (/^http/.test(url)) {
    load(url)
    return doc
  }

  win.on('page-title-updated', () => {
    url = win.getUrl()
    load(url)
  })

  return doc

  function progress (count, last) {
    if (count === 0) {
      app.dock.setBadge('PDF')
    }

    var perc = count / last
    perc = perc === 1 ? -1 : perc
    win.setProgressBar(perc)
    if (perc === -1) {
      app.dock.setBadge('')
    }
  }

  function load (url) {
    pdfWin.loadUURL(url)
    pdfWin.webContents.on('did-finish-load', () => {
      process.capture = function capture (last, cb) {
        progress(capture.count, last)
        pdfWin.capturePage(image => {
          capture.count += 1
          doc.addPage()
          doc.image(image.toPng(), 14.5, 22, {
            width: 813
          })
        })
        cb()
      }
      process.capture.count = 0

      pdfWin.on('closed', () => {
        pdfWin = null
        delete process.capture
        doc.end()
      })

      pdfWin.webContents.executeJavaScript(`
        var capture = require('remote').process.capture
        var last = BESPOKE_PDF.slides.length - 1
        document.documentElement.classList.add('pdf')
        var s = document.createElement('style')
        s.innerHTML = '.pdf * { -webkit-transition:none!important }'
        document.body.appendChild(s)

        function walk() {
          BESPOKE_PDF.once('activate', e => {
            if (e.index === BESPOKE_PDF.slides.length - 1)
              return brute(e)

            requestAnimationFrame(()=> {
              BESPOKE_PDF.slide(e.index + 1)
              requestAnimationFrame(()=> {
                BESPOKE_PDF.prev()
                requestAnimationFrame(()=>
                  capture(last, ()=> {
                    requestAnimationFrame(()=> {
                      walk()
                      requestAnimationFrame(()=> {
                        BESPOKE_PDF.slide(e.index + 1)
                      })
                    })
                  })
                )
              })
            })

          })
        }

        walk()
        BESPOKE_PDF.slide(0)

        function brute(e, force) {
          BESPOKE_PDF.slide(e.index + 1)
          force = force || 40; //will there be more than 40 bullets?
          while (force--) requestAnimationFrame(()=>BESPOKE_PDF.next())
          requestAnimationFrame(() => capture(last, () => {
            setTimeout(close, 500)
          }))

        }
      `)
    })
  }
}

function makePdf () {
  Pdf.addPage = Pdf.prototype.addPage
  Pdf.prototype.addPage = () => {
  }
  var doc = new Pdf({
    size: 'A4',
    layout: 'landscape'
  })
  Pdf.prototype.addPage = Pdf.addPage
  return doc
}
