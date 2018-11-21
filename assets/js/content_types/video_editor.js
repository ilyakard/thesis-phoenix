import React from 'react'
import VideoTray from './video_tray'
import Net from '../utilities/net'

class VideoEditor {
  constructor (opts) {
    this.editors = document.querySelectorAll('.thesis-content-video')
    this.enabled = false

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

    url = e.currentTarget.querySelector('video source').getAttribute('src')

    this.openTray({ contentId: id, url: url, alt: meta.alt })
  }

  tray (trayData) {
    return <VideoTray
      data={trayData}
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
    return ed.querySelector('video source').getAttribute('src')
  }

  uploadAndSet (data, page, callback) {
    const video = this.determineVideoUrl(data.content, page.origin)
    const editor = document.querySelector(`[data-thesis-content-id="${data.name}"]`)

    if (!video || !editor) {
      callback(); return
    }

    if (!video.upload) {
      callback()
      this.set(data.name, {url: video.videoUrl}, data.meta)
    } else {
      Net.post('/thesis/files/import', {video_url: video.videoUrl, video_name: data.name})
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
    const source = editor.querySelector('video source')
    source.src = data.url
    source.alt = JSON.parse(meta).alt
  }

  determineVideoUrl (video, origin) {
    if (video.trim() === '') {
      return null
    } else if (this.isVideoAbsoluteUrl(video)) {
      return {videoUrl: video.trim()}
    } else if (this.isVideoUrlWithoutProtocol(video)) {
      return {videoUrl: 'http:' + video.trim()}
    } else if (typeof origin === 'undefined') {
      return {upload: false, videoUrl: video}
    } else {
      return {videoUrl: origin + video.trim()}
    }
  }

  isVideoAbsoluteUrl (video) {
    const index = video.trim().indexOf('//')
    return (index > 4 && index < 7)
  }

  isVideoUrlWithoutProtocol (video) {
    const index = video.trim().indexOf('//')
    return (index === 0)
  }
}

export default VideoEditor
