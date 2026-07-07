import React from "react"
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiUrl, getJson, postForm, postJson } from '../api.js'
import { useToast } from '../contexts/ToastContext.jsx'

export default function Files() {
  const toast = useToast()
  const [curPath, setCurPath] = useState('')
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [content, setContent] = useState('')
  const [ctx, setCtx] = useState(null)
  const uploadRef = useRef(null)

  const loadDir = useCallback(async (p = curPath) => {
    try {
      const d = await getJson(`/api/files/list?path=${encodeURIComponent(p)}`)
      setCurPath(p)
      setItems(d.items || [])
      setSelected(null)
      setContent('')
    } catch (e) {
      toast(e.message, 'danger')
    }
  }, [curPath, toast])

  useEffect(() => {
    loadDir('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openFile(item) {
    setSelected(item)
    if (item.is_text) {
      const d = await getJson(`/api/files/read?path=${encodeURIComponent(item.path)}`)
      if (d.success) setContent(d.content || '')
      else toast(d.content, 'danger')
    }
  }

  async function saveFile() {
    if (!selected) return
    const d = await postJson('/api/files/write', { path: selected.path, content })
    toast(d.message, d.success ? 'success' : 'danger')
  }

  function goUp() {
    const parts = curPath.split('/').filter(Boolean)
    parts.pop()
    loadDir(parts.join('/'))
  }

  async function newFolder() {
    const name = window.prompt('Nama folder:')
    if (!name) return
    const d = await postJson('/api/files/mkdir', { path: curPath, name })
    toast(d.message, d.success ? 'success' : 'danger')
    if (d.success) loadDir(curPath)
  }

  async function newFile() {
    const name = window.prompt('Nama file:')
    if (!name) return
    const d = await postJson('/api/files/write', { path: `${curPath}/${name}`.replace(/^\//, ''), content: '' })
    toast(d.message, d.success ? 'success' : 'danger')
    if (d.success) loadDir(curPath)
  }

  async function uploadFiles() {
    const files = uploadRef.current?.files
    if (!files?.length) return

    const fd = new FormData()
    fd.append('path', curPath)
    Array.from(files).forEach((f) => fd.append('files', f))

    const d = await postForm('/api/files/upload', fd)
    toast(d.message, d.success ? 'success' : 'danger')
    if (d.success) {
      uploadRef.current.value = ''
      loadDir(curPath)
    }
  }

  async function renameItem() {
    const name = window.prompt('Nama baru:')
    if (!name || !ctx) return
    const d = await postJson('/api/files/rename', { path: ctx.item.path, new_name: name })
    toast(d.message, d.success ? 'success' : 'danger')
    setCtx(null)
    if (d.success) loadDir(curPath)
  }

  async function deleteItem() {
    if (!ctx || !window.confirm(`Hapus "${ctx.item.path}"?`)) return
    const d = await postJson('/api/files/delete', { path: ctx.item.path })
    toast(d.message, d.success ? 'success' : 'danger')
    setCtx(null)
    if (d.success) loadDir(curPath)
  }

  async function compressItem() {
    if (!ctx) return
    const d = await postJson('/api/files/compress', { path: ctx.item.path })
    toast(d.message, d.success ? 'success' : 'danger')
    setCtx(null)
    if (d.success) loadDir(curPath)
  }

  async function extractItem() {
    if (!ctx) return
    const d = await postJson('/api/files/extract', { path: ctx.item.path })
    toast(d.message, d.success ? 'success' : 'danger')
    setCtx(null)
    if (d.success) loadDir(curPath)
  }

  return (
    <div onClick={() => setCtx(null)}>
      <div className="card overflow-hidden">
        <div className="toolbar">
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-sm btn-outline-secondary px-2 border-0" onClick={goUp}><i className="bi bi-arrow-left" /></button>
            <span className="text-muted font-monospace small">/{curPath}</span>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-outline-secondary border-0" onClick={() => loadDir(curPath)}><i className="bi bi-arrow-clockwise" /></button>
            <button className="btn btn-sm btn-outline-secondary border-0" onClick={newFolder}><i className="bi bi-folder-plus" /></button>
            <button className="btn btn-sm btn-outline-secondary border-0" onClick={newFile}><i className="bi bi-file-earmark-plus" /></button>
            <label className="btn btn-sm btn-outline-secondary border-0 mb-0">
              <i className="bi bi-upload" />
              <input ref={uploadRef} type="file" multiple hidden onChange={uploadFiles} />
            </label>
            {selected?.is_text && <button className="btn btn-sm btn-primary" onClick={saveFile}><i className="bi bi-floppy me-1" /> Save</button>}
          </div>
        </div>

        <div className="d-flex w-100">
          <div id="filetree" style={{ width: 250, flexShrink: 0 }}>
            {items.map((item) => (
              <div
                key={item.path}
                className={`fitem ${selected?.path === item.path ? 'selected' : ''}`}
                onClick={() => item.is_dir ? loadDir(item.path) : openFile(item)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setCtx({ x: e.clientX, y: e.clientY, item })
                }}
              >
                <i className={`bi ${item.is_dir ? 'bi-folder-fill' : 'bi-file-earmark'} text-muted`} />
                <span className="flex-grow-1 text-truncate">{item.name}</span>
                {!item.is_dir && <small style={{ fontSize: '.7rem', opacity: .7 }}>{item.size}</small>}
              </div>
            ))}
          </div>

          <div id="fileview" className="flex-grow-1 position-relative">
            {!selected && (
              <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted">
                <i className="bi bi-file-earmark-code mb-3" style={{ fontSize: '2.5rem', opacity: .5 }} />
                <span className="small fw-medium">Pilih file untuk mengedit</span>
              </div>
            )}

            {selected?.is_text && <textarea id="editor" spellCheck="false" value={content} onChange={(e) => setContent(e.target.value)} />}

            {selected?.is_image && (
              <img
                alt="preview"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '2rem' }}
                src={apiUrl(`/api/files/raw?path=${encodeURIComponent(selected.path)}`)}
              />
            )}

            {selected && !selected.is_text && !selected.is_image && (
              <div className="h-100 d-flex align-items-center justify-content-center text-center text-muted">
                <div>
                  <i className="bi bi-file-earmark-binary d-block mb-3" style={{ fontSize: '2rem', opacity: .5 }} />
                  <span className="d-block small mb-3">Binary File</span>
                  <a href={apiUrl(`/api/files/download?path=${encodeURIComponent(selected.path)}`)} className="btn btn-sm btn-outline-secondary">
                    <i className="bi bi-download me-1" /> Download
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {ctx && (
        <div className="ctx-menu" style={{ top: ctx.y, left: ctx.x }} onClick={(e) => e.stopPropagation()}>
          <div className="ctx-item" onClick={renameItem}><i className="bi bi-pencil text-muted" />Rename</div>
          <div className="ctx-item text-danger" onClick={deleteItem}><i className="bi bi-trash" />Delete</div>
          <a className="ctx-item" href={apiUrl(`/api/files/download?path=${encodeURIComponent(ctx.item.path)}`)}><i className="bi bi-download text-muted" />Download</a>
          <div className="ctx-item" onClick={compressItem}><i className="bi bi-file-earmark-zip text-muted" />Compress</div>
          {ctx.item.ext === '.zip' && <div className="ctx-item" onClick={extractItem}><i className="bi bi-box-arrow-down text-muted" />Extract</div>}
        </div>
      )}
    </div>
  )
}
