import React from 'react'
import ImageTray from './image_tray'
import Net from '../utilities/net'

class ImageEditor {
  constructor (opts) {
    this.editors = document.querySelectorAll('.thesis-content-image, .thesis-content-background_image')
    this.enabled = false

    this.ospryPublicKey = opts.ospryPublicKey
    this.fileUploader = opts.fileUploader
    this.openTray = opts.openTray
    this.closeTray = opts.closeTray

    this.clicked = this.clicked.bind(this)
    this.onSubmit = this.onSubmit.bind(this)
  }

  enable () {
    if (this.enabled) return
    for (let i = 0; i < this.editors.length; i++) {
      this.editors[i].addEventListener('click', this.clicked, false)
    }
    this.enabled = true
  }

  disable () {
    if (!this.enabled) return
    for (let i = 0; i < this.editors.length; i++) {
      this.editors[i].removeEventListener('click', this.clicked, false)
    }
    this.enabled = false
  }

  clicked (e) {
    const id = e.currentTarget.getAttribute('data-thesis-content-id')
    const type = e.currentTarget.getAttribute('data-thesis-content-type')
    const meta = JSON.parse(e.currentTarget.getAttribute('data-thesis-content-meta'))
    let url = ''

    if (type === 'image') {
      url = e.currentTarget.querySelector('img').getAttribute('src')
    } else if (type === 'background_image') {
      url = this.getUrlFromStyle(e.currentTarget.style.backgroundImage)
    }

    this.openTray({ contentId: id, url: url, alt: meta.alt })
  }

  tray (trayData) {
    return <ImageTray
      data={trayData}
      ospryPublicKey={this.ospryPublicKey}
      fileUploader={this.fileUploader}
      onCancel={this.closeTray}
      onSubmit={this.onSubmit} />
  }

  onSubmit (data) {
    this.set(data.contentId, data)
    this.closeTray()
  }

  getContent (ed) {
    const type = ed.getAttribute('data-thesis-content-type')
    if (type === 'image') {
      return ed.querySelector('img').getAttribute('src')
    } else {
      return this.getUrlFromStyle(ed.style.backgroundImage)
    }
  }

  uploadAndSet (data, page, callback) {
    const image = this.determineImageUrl(data.content, page.origin)
    const editor = document.querySelector(`[data-thesis-content-id="${data.name}"]`)

    if (!image || !editor) {
      callback(); return
    }

    if (!image.upload) {
      callback()
      this.set(data.name, {url: image.imageUrl}, data.meta)
    } else {
      Net.post('/thesis/files/import', {image_url: image.imageUrl, image_name: data.name})
      .then((response) => {
        callback()
        if (response.path.length > 0) this.set(data.name, {url: response.path}, data.meta)
      })
      .catch((error) => { callback(); window.alert(`${data.name} could not be saved.`) })
    }
  }

  set (name, data, meta = null) {
    const editor = document.querySelector(`[data-thesis-content-id="${name}"]`)
    editor.classList.add('modified')

    if (!meta) {
      const prevMeta = JSON.parse(editor.getAttribute('data-thesis-content-meta'))
      const newMeta = Object.assign({}, prevMeta, {alt: data.alt})
      meta = JSON.stringify(newMeta)
    }

    editor.setAttribute('data-thesis-content-meta', meta)

    const type = editor.getAttribute('data-thesis-content-type')
    if (type === 'image') {
      const img = editor.querySelector('img')
      img.src = data.url
      img.alt = JSON.parse(meta).alt
    } else if (type === 'background_image') {
      editor.style.backgroundImage = `url("${data.url}")`
    }
  }

  determineImageUrl (image, origin) {
    if (image.trim() === '') {
      return null
    } else if (this.isImageAbsoluteUrl(image)) {
      return {imageUrl: image.trim()}
    } else if (this.isImageUrlWithoutProtocol(image)) {
      return {imageUrl: 'http:' + image.trim()}
    } else if (typeof origin === 'undefined') {
      return {upload: false, imageUrl: image}
    } else {
      return {imageUrl: origin + image.trim()}
    }
  }

  isImageAbsoluteUrl (image) {
    const index = image.trim().indexOf('//')
    return (index > 4 && index < 7)
  }

  isImageUrlWithoutProtocol (image) {
    const index = image.trim().indexOf('//')
    return (index === 0)
  }

  getUrlFromStyle (style) {
    return style.replace(/\'/g, '').replace(/"/g, '').replace('url(', '').replace(')', '')
  }
}

export default ImageEditor
