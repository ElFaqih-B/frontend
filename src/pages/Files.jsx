import React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiUrl, getJson, postForm, postJson } from '../api.js'
import { useToast } from '../contexts/ToastContext.jsx'

const TEXT_EXTENSIONS = new Set([
  '.txt', '.yml', '.yaml', '.json', '.properties', '.toml', '.conf', '.cfg',
  '.log', '.md', '.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.xml',
  '.sh', '.bat', '.py', '.java', '.env', '.ini'
])

const ICONS = {
  folder: ['bi-folder-fill', 'file-c-folder'],
  jar: ['bi-box-seam-fill', 'file-c-jar'],
  zip: ['bi-file-earmark-zip-fill', 'file-c-zip'],
  image: ['bi-file-earmark-image-fill', 'file-c-image'],
  json: ['bi-braces', 'file-c-json'],
  yaml: ['bi-diagram-3-fill', 'file-c-yaml'],
  properties: ['bi-sliders', 'file-c-props'],
  log: ['bi-terminal-fill', 'file-c-log'],
  code: ['bi-file-earmark-code-fill', 'file-c-code'],
  text: ['bi-file-earmark-text-fill', 'file-c-text'],
  binary: ['bi-file-earmark-binary-fill', 'file-c-bin'],
}

function extOf(item) {
  const fromApi = item?.ext || ''
  if (fromApi) return fromApi.toLowerCase()

  const name = item?.name || ''
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx).toLowerCase() : ''
}

function fileIcon(item) {
  if (item.is_dir) return ICONS.folder

  const ext = extOf(item)

  if (ext === '.jar') return ICONS.jar
  if (ext === '.zip' || ext === '.rar' || ext === '.7z') return ICONS.zip
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) return ICONS.image
  if (ext === '.json') return ICONS.json
  if (ext === '.yml' || ext === '.yaml') return ICONS.yaml
  if (ext === '.properties' || ext === '.env' || ext === '.cfg' || ext === '.conf') return ICONS.properties
  if (ext === '.log') return ICONS.log
  if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.css', '.html', '.xml', '.sh', '.bat'].includes(ext)) return ICONS.code
  if (TEXT_EXTENSIONS.has(ext) || item.is_text) return ICONS.text

  return ICONS.binary
}

function formatPath(path) {
  if (!path) return '/'
  return `/${path}`
}

function splitPath(path) {
  return path.split('/').filter(Boolean)
}

function normalizePath(path) {
  return String(path || '').replace(/^\/+/, '').replace(/\/+/g, '/')
}

function isConfigFile(item) {
  const ext = extOf(item)
  return ['.yml', '.yaml', '.json', '.properties', '.toml', '.conf', '.cfg', '.env'].includes(ext)
}

function lineCount(text) {
  if (!text) return 1
  return text.split('\n').length
}

function findMatches(content, query) {
  if (!query.trim()) return []

  const q = query.toLowerCase()
  const lines = content.split('\n')
  const result = []

  lines.forEach((line, index) => {
    const col = line.toLowerCase().indexOf(q)
    if (col >= 0) {
      result.push({
        line: index + 1,
        col: col + 1,
        text: line,
      })
    }
  })

  return result
}

export default function Files() {
  const toast = useToast()

  const [curPath, setCurPath] = useState('')
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [ctx, setCtx] = useState(null)

  const [fileSearch, setFileSearch] = useState('')
  const [codeSearch, setCodeSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const uploadRef = useRef(null)
  const editorRef = useRef(null)

  const dirty = selected?.is_text && content !== originalContent
  const matches = useMemo(() => findMatches(content, codeSearch), [content, codeSearch])

  const filteredItems = useMemo(() => {
    const q = fileSearch.trim().toLowerCase()

    const sorted = [...items].sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1
      return String(a.name).localeCompare(String(b.name))
    })

    if (!q) return sorted

    return sorted.filter((item) => {
      const name = String(item.name || '').toLowerCase()
      const path = String(item.path || '').toLowerCase()
      return name.includes(q) || path.includes(q)
    })
  }, [items, fileSearch])

  const loadDir = useCallback(async (p = curPath) => {
    setLoading(true)

    try {
      const clean = normalizePath(p)
      const d = await getJson(`/api/files/list?path=${encodeURIComponent(clean)}`)

      setCurPath(clean)
      setItems(d.items || [])
      setSelected(null)
      setContent('')
      setOriginalContent('')
      setCodeSearch('')
      setCtx(null)
    } catch (e) {
      toast(e.message, 'danger')
    } finally {
      setLoading(false)
    }
  }, [curPath, toast])

  useEffect(() => {
    loadDir('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openFile(item) {
    setCtx(null)
    setSelected(item)
    setCodeSearch('')

    if (item.is_text) {
      try {
        const d = await getJson(`/api/files/read?path=${encodeURIComponent(item.path)}`)

        if (d.success) {
          setContent(d.content || '')
          setOriginalContent(d.content || '')
        } else {
          setContent('')
          setOriginalContent('')
          toast(d.content || 'Gagal membaca file.', 'danger')
        }
      } catch (e) {
        setContent('')
        setOriginalContent('')
        toast(e.message, 'danger')
      }
    } else {
      setContent('')
      setOriginalContent('')
    }
  }

  async function saveFile() {
    if (!selected || !selected.is_text) return

    setSaving(true)

    try {
      const d = await postJson('/api/files/write', {
        path: selected.path,
        content,
      })

      toast(d.message || 'File disimpan.', d.success ? 'success' : 'danger')

      if (d.success) {
        setOriginalContent(content)
        loadDir(curPath)
      }
    } catch (e) {
      toast(e.message, 'danger')
    } finally {
      setSaving(false)
    }
  }

  function goUp() {
    const parts = splitPath(curPath)
    parts.pop()
    loadDir(parts.join('/'))
  }

  function jumpToBreadcrumb(index) {
    const parts = splitPath(curPath)
    const next = parts.slice(0, index + 1).join('/')
    loadDir(next)
  }

  async function newFolder() {
    const name = window.prompt('Nama folder:')
    if (!name) return

    const d = await postJson('/api/files/mkdir', {
      path: curPath,
      name,
    })

    toast(d.message, d.success ? 'success' : 'danger')
    if (d.success) loadDir(curPath)
  }

  async function newFile() {
    const name = window.prompt('Nama file:')
    if (!name) return

    const path = normalizePath(`${curPath}/${name}`)

    const d = await postJson('/api/files/write', {
      path,
      content: '',
    })

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

    const d = await postJson('/api/files/rename', {
      path: ctx.item.path,
      new_name: name,
    })

    toast(d.message, d.success ? 'success' : 'danger')
    setCtx(null)
    if (d.success) loadDir(curPath)
  }

  async function deleteItem() {
    if (!ctx) return
    if (!window.confirm(`Hapus "${ctx.item.path}"?`)) return

    const d = await postJson('/api/files/delete', {
      path: ctx.item.path,
    })

    toast(d.message, d.success ? 'success' : 'danger')
    setCtx(null)
    if (d.success) loadDir(curPath)
  }

  async function compressItem() {
    if (!ctx) return

    const d = await postJson('/api/files/compress', {
      path: ctx.item.path,
    })

    toast(d.message, d.success ? 'success' : 'danger')
    setCtx(null)
    if (d.success) loadDir(curPath)
  }

  async function extractItem() {
    if (!ctx) return

    const d = await postJson('/api/files/extract', {
      path: ctx.item.path,
    })

    toast(d.message, d.success ? 'success' : 'danger')
    setCtx(null)
    if (d.success) loadDir(curPath)
  }

  function selectMatch(match) {
    if (!editorRef.current) return

    const lines = content.split('\n')
    let index = 0

    for (let i = 0; i < match.line - 1; i += 1) {
      index += lines[i].length + 1
    }

    index += match.col - 1

    editorRef.current.focus()
    editorRef.current.setSelectionRange(index, index + codeSearch.length)
  }

  function onEditorKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      saveFile()
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault()
      const el = document.getElementById('file-code-search')
      el?.focus()
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const next = `${content.substring(0, start)}  ${content.substring(end)}`
      setContent(next)

      requestAnimationFrame(() => {
        textarea.selectionStart = start + 2
        textarea.selectionEnd = start + 2
      })
    }
  }

  const breadcrumbParts = splitPath(curPath)
  const selectedExt = selected ? extOf(selected) : ''
  const selectedIsConfig = selected ? isConfigFile(selected) : false

  return (
    <div className="files-workbench" onClick={() => setCtx(null)}>
      <div className="files-titlebar">
        <div className="files-title-left">
          <button className="btn btn-soft btn-sm files-icon-btn" onClick={goUp} disabled={!curPath}>
            <i className="bi bi-arrow-left" />
          </button>

          <button className="btn btn-soft btn-sm files-icon-btn" onClick={() => loadDir(curPath)} disabled={loading}>
            <i className={`bi ${loading ? 'bi-arrow-repeat' : 'bi-arrow-clockwise'}`} />
          </button>

          <div className="files-path">
            <button className="files-crumb root" onClick={() => loadDir('')}>server</button>
            {breadcrumbParts.map((part, index) => (
              <React.Fragment key={`${part}-${index}`}>
                <span className="files-sep">/</span>
                <button className="files-crumb" onClick={() => jumpToBreadcrumb(index)}>
                  {part}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="files-title-actions">
          <button className="btn btn-soft btn-sm" onClick={newFolder}>
            <i className="bi bi-folder-plus me-1" />
            Folder
          </button>

          <button className="btn btn-soft btn-sm" onClick={newFile}>
            <i className="bi bi-file-earmark-plus me-1" />
            File
          </button>

          <label className="btn btn-soft btn-sm mb-0">
            <i className="bi bi-upload me-1" />
            Upload
            <input ref={uploadRef} type="file" multiple hidden onChange={uploadFiles} />
          </label>

          {selected?.is_text && (
            <button className="btn btn-primary btn-sm" onClick={saveFile} disabled={saving || !dirty}>
              <i className="bi bi-floppy me-1" />
              {saving ? 'Saving...' : dirty ? 'Save' : 'Saved'}
            </button>
          )}
        </div>
      </div>

      <div className="files-main">
        <aside className="files-explorer">
          <div className="files-explorer-head">
            <div>
              <div className="files-section-title">Explorer</div>
              <div className="files-section-sub">{filteredItems.length} item</div>
            </div>
          </div>

          <div className="files-search">
            <i className="bi bi-search" />
            <input
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="Search files..."
            />
            {fileSearch && (
              <button onClick={() => setFileSearch('')}>
                <i className="bi bi-x" />
              </button>
            )}
          </div>

          <div className="files-tree">
            {filteredItems.length ? (
              filteredItems.map((item) => {
                const [icon, colorClass] = fileIcon(item)
                const active = selected?.path === item.path

                return (
                  <div
                    key={item.path}
                    className={`file-row ${active ? 'active' : ''} ${item.is_dir ? 'is-dir' : ''}`}
                    onClick={() => item.is_dir ? loadDir(item.path) : openFile(item)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setCtx({ x: e.clientX, y: e.clientY, item })
                    }}
                    title={item.path}
                  >
                    <i className={`bi ${icon} file-icon ${colorClass}`} />
                    <span className="file-name">{item.name}</span>
                    {!item.is_dir && <span className="file-size">{item.size}</span>}
                  </div>
                )
              })
            ) : (
              <div className="files-empty-small">
                <i className="bi bi-search" />
                <span>Tidak ada file cocok.</span>
              </div>
            )}
          </div>
        </aside>

        <section className="files-editor">
          <div className="files-editor-tabs">
            {selected ? (
              <div className={`files-tab ${dirty ? 'dirty' : ''}`}>
                <i className={`bi ${fileIcon(selected)[0]} file-icon ${fileIcon(selected)[1]}`} />
                <span>{selected.name}</span>
                {dirty && <b />}
              </div>
            ) : (
              <div className="files-tab muted">
                <i className="bi bi-file-earmark" />
                <span>No file selected</span>
              </div>
            )}

            {selected?.is_text && (
              <div className="files-code-tools">
                <div className="files-code-search">
                  <i className="bi bi-search" />
                  <input
                    id="file-code-search"
                    value={codeSearch}
                    onChange={(e) => setCodeSearch(e.target.value)}
                    placeholder="Search in file..."
                  />
                  {codeSearch && (
                    <button onClick={() => setCodeSearch('')}>
                      <i className="bi bi-x" />
                    </button>
                  )}
                </div>

                <span className="files-code-counter">
                  {codeSearch ? `${matches.length} match` : `${lineCount(content)} lines`}
                </span>
              </div>
            )}
          </div>

          <div className="files-editor-body">
            {!selected && (
              <div className="files-empty">
                <i className="bi bi-file-earmark-code" />
                <div>Pilih file untuk diedit</div>
                <small>Gunakan explorer kiri untuk membuka config, plugin file, atau log.</small>
              </div>
            )}

            {selected?.is_text && (
              <div className="files-code-layout">
                <div className="files-gutter">
                  {Array.from({ length: lineCount(content) }).map((_, index) => (
                    <div key={index}>{index + 1}</div>
                  ))}
                </div>

                <textarea
                  ref={editorRef}
                  id="editor"
                  spellCheck="false"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={onEditorKeyDown}
                  className={selectedIsConfig ? 'is-config' : ''}
                />
              </div>
            )}

            {selected?.is_image && (
              <div className="files-preview">
                <img
                  alt="preview"
                  src={apiUrl(`/api/files/raw?path=${encodeURIComponent(selected.path)}`)}
                />
              </div>
            )}

            {selected && !selected.is_text && !selected.is_image && (
              <div className="files-empty">
                <i className="bi bi-file-earmark-binary" />
                <div>Binary File</div>
                <small>{selected.name} tidak bisa diedit sebagai teks.</small>

                <a
                  href={apiUrl(`/api/files/download?path=${encodeURIComponent(selected.path)}`)}
                  className="btn btn-soft btn-sm mt-3"
                >
                  <i className="bi bi-download me-1" />
                  Download
                </a>
              </div>
            )}
          </div>

          {selected && (
            <div className="files-statusbar">
              <span>{formatPath(selected.path)}</span>
              <span>{selectedExt || 'file'}</span>
              {selected?.is_text && <span>{lineCount(content)} lines</span>}
              {selected?.is_text && <span>{dirty ? 'Unsaved changes' : 'Saved'}</span>}
            </div>
          )}

          {selected?.is_text && codeSearch && matches.length > 0 && (
            <div className="files-search-results">
              <div className="files-search-results-head">
                Search results
                <span>{matches.length}</span>
              </div>

              {matches.slice(0, 10).map((match) => (
                <button
                  key={`${match.line}-${match.col}-${match.text}`}
                  onClick={() => selectMatch(match)}
                >
                  <span className="mono">L{match.line}</span>
                  <span>{match.text.trim() || '(empty line)'}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {ctx && (
        <div
          className="ctx-menu vscode-ctx"
          style={{ top: ctx.y, left: ctx.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ctx-item" onClick={() => {
            setCtx(null)
            ctx.item.is_dir ? loadDir(ctx.item.path) : openFile(ctx.item)
          }}>
            <i className="bi bi-box-arrow-up-right text-muted" />
            Open
          </div>

          <div className="ctx-item" onClick={renameItem}>
            <i className="bi bi-pencil text-muted" />
            Rename
          </div>

          <div className="ctx-item text-danger" onClick={deleteItem}>
            <i className="bi bi-trash" />
            Delete
          </div>

          <a
            className="ctx-item"
            href={apiUrl(`/api/files/download?path=${encodeURIComponent(ctx.item.path)}`)}
          >
            <i className="bi bi-download text-muted" />
            Download
          </a>

          <div className="ctx-separator" />

          <div className="ctx-item" onClick={compressItem}>
            <i className="bi bi-file-earmark-zip text-muted" />
            Compress
          </div>

          {ctx.item.ext === '.zip' && (
            <div className="ctx-item" onClick={extractItem}>
              <i className="bi bi-box-arrow-down text-muted" />
              Extract
            </div>
          )}
        </div>
      )}
    </div>
  )
}