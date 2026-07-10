import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiUrl, getJson, postForm, postJson } from '../api.js'
import EmptyState from '../components/EmptyState.jsx'
import Icon from '../components/Icons.jsx'
import Modal from '../components/Modal.jsx'
import SearchBar from '../components/SearchBar.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

const COLOR_MAP = {
  jar: 'text-[#c586c0]', json: 'text-[#dcdcaa]', yml: 'text-[#9cdcfe]', yaml: 'text-[#9cdcfe]', properties: 'text-[#ce9178]', log: 'text-[#b5cea8]', txt: 'text-[#d4d4d4]', js: 'text-[#dcdcaa]', jsx: 'text-[#dcdcaa]', py: 'text-[#4ec9b0]', md: 'text-[#569cd6]', zip: 'text-[#c586c0]', toml: 'text-[#9cdcfe]', ini: 'text-[#ce9178]'
}
const EDITABLE = new Set(['txt','yml','yaml','json','properties','cfg','conf','log','md','js','jsx','ts','tsx','py','toml','ini','env'])

function extOf(name = '') { return String(name).split('.').pop()?.toLowerCase() || '' }
function fileColor(item) { if (item.is_dir || item.type === 'dir') return 'text-[#dcb67a]'; return COLOR_MAP[extOf(item.name || item.path)] || 'text-dim' }
function parentPath(path) { const clean = String(path || '').replace(/\/+$/, ''); const i = clean.lastIndexOf('/'); return i <= 0 ? '' : clean.slice(0, i) }
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
function highlightCode(text) {
  let html = escapeHtml(text || '')
  html = html.replace(/(#[^\n]*|\/\/[^\n]*)/g, '<span class="text-[#6a9955]">$1</span>')
  html = html.replace(/(&quot;.*?&quot;|'.*?')/g, '<span class="text-[#ce9178]">$1</span>')
  html = html.replace(/\b(true|false|null|None|ON|OFF|normal|easy|hard|survival|creative|adventure|spectator)\b/gi, '<span class="text-[#569cd6]">$1</span>')
  html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="text-[#b5cea8]">$1</span>')
  html = html.replace(/^([\w.-]+)(\s*[:=])/gm, '<span class="text-[#9cdcfe]">$1</span>$2')
  html = html.replace(/\b(function|const|let|var|return|import|from|export|async|await|def|class|if|else|for|while|try|catch)\b/g, '<span class="text-[#c586c0]">$1</span>')
  return html
}

export default function Files() {
  const toast = useToast()
  const fileRef = useRef(null)

  const [path, setPath] = useState('')
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [opened, setOpened] = useState(null)
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [newModal, setNewModal] = useState(null)
  const [renameItem, setRenameItem] = useState(null)

  const load = useCallback(async (nextPath = path) => {
    setBusy(true)
    try {
      const clean = nextPath || ''
      const data = await getJson(`/api/files/list?path=${encodeURIComponent(clean)}`)
      setItems(Array.isArray(data.items) ? data.items : [])
      setPath(clean)
    } catch (e) {
      toast(e.message || 'Gagal membuka folder.', 'danger')
    } finally {
      setBusy(false)
    }
  }, [path, toast])

  useEffect(() => {
    load('')
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => [item.name, item.path, item.type].join(' ').toLowerCase().includes(q))
  }, [items, query])

  async function openItem(item) {
    if (item.is_dir || item.type === 'dir') {
      load(item.path)
      return
    }

    const ext = extOf(item.name || item.path)
    if (!EDITABLE.has(ext)) {
      window.open(apiUrl(`/api/files/download?path=${encodeURIComponent(item.path)}`), '_blank')
      return
    }

    try {
      const data = await getJson(`/api/files/read?path=${encodeURIComponent(item.path)}`)
      setOpened(item)
      setContent(data.content || '')
      setDirty(false)
      setEditMode(false)
    } catch (e) {
      toast(e.message || 'Gagal membaca file.', 'danger')
    }
  }

  async function saveFile() {
    if (!opened) return
    try {
      const data = await postJson('/api/files/write', { path: opened.path, content })
      toast(data.message || 'File disimpan.', data.success === false ? 'danger' : 'success')
      setDirty(false)
      setEditMode(false)
      load(path)
    } catch (e) {
      toast(e.message || 'Gagal menyimpan file.', 'danger')
    }
  }

  async function createItem(e) {
    e.preventDefault()
    const name = e.currentTarget.name.value.trim()
    if (!name) return

    try {
      const bodyPath = path ? `${path}/${name}` : name
      const data = newModal === 'folder'
        ? await postJson('/api/files/mkdir', { path: bodyPath })
        : await postJson('/api/files/write', { path: bodyPath, content: '' })
      toast(data.message || 'Item dibuat.', data.success === false ? 'danger' : 'success')
      setNewModal(null)
      load(path)
    } catch (err) {
      toast(err.message || 'Gagal membuat item.', 'danger')
    }
  }

  async function upload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const fd = new FormData()
    fd.append('path', path || '')
    fd.append('files', file)
    fd.append('file', file)

    try {
      const data = await postForm('/api/files/upload', fd)
      toast(data.message || 'Upload berhasil.', data.success === false ? 'danger' : 'success')
      load(path)
    } catch (err) {
      toast(err.message || 'Upload gagal.', 'danger')
    } finally {
      e.target.value = ''
    }
  }

  async function rename(e) {
    e.preventDefault()
    const name = e.currentTarget.name.value.trim()
    if (!name || !renameItem) return

    try {
      const data = await postJson('/api/files/rename', { path: renameItem.path, new_name: name })
      toast(data.message || 'Rename berhasil.', data.success === false ? 'danger' : 'success')
      setRenameItem(null)
      load(path)
    } catch (err) {
      toast(err.message || 'Rename gagal.', 'danger')
    }
  }

  async function del(item) {
    if (!window.confirm(`Hapus ${item.name}?`)) return
    try {
      const data = await postJson('/api/files/delete', { path: item.path })
      toast(data.message || 'File dihapus.', data.success === false ? 'danger' : 'success')
      if (opened?.path === item.path) setOpened(null)
      load(path)
    } catch (err) {
      toast(err.message || 'Delete gagal.', 'danger')
    }
  }

  async function archive(action, item) {
    try {
      const data = await postJson(`/api/files/${action}`, { path: item.path })
      toast(data.message || `${action} berhasil.`, data.success === false ? 'danger' : 'success')
      load(path)
    } catch (err) {
      toast(err.message || `${action} gagal.`, 'danger')
    }
  }

  return (
    <div className="panel h-[calc(100vh-120px)] min-h-[620px] overflow-hidden">
      <div className="flex h-12 items-center justify-between gap-3 border-b border-soft px-3">
        <div className="flex min-w-0 items-center gap-2 font-mono text-xs text-dim">
          <button className="btn btn-icon" onClick={() => load(parentPath(path))} title="Up">..</button>
          <span className="truncate">/{path || ''}</span>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <input ref={fileRef} type="file" className="hidden" onChange={upload} />
          <button className="btn btn-icon" onClick={() => setNewModal('folder')} title="New folder"><Icon name="folder" /></button>
          <button className="btn btn-icon" onClick={() => setNewModal('file')} title="New file"><Icon name="plus" /></button>
          <button className="btn btn-icon" onClick={() => fileRef.current?.click()} title="Upload"><Icon name="upload" /></button>
          <button className="btn btn-icon" onClick={() => load(path)} title="Refresh" disabled={busy}><Icon name="refresh" /></button>
        </div>
      </div>

      <div className="grid h-[calc(100%-48px)] grid-cols-1 md:grid-cols-[300px_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-soft md:border-b-0 md:border-r md:border-soft">
          <div className="border-b border-soft p-2"><SearchBar value={query} onChange={setQuery} placeholder="Search files..." /></div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {path ? <button className="mb-1 flex h-8 w-full items-center gap-2 rounded-panel px-2 text-left font-mono text-xs text-faint hover:bg-hover" onClick={() => load(parentPath(path))}>../</button> : null}
            {filtered.length ? filtered.map((item) => (
              <div key={item.path || item.name} className="group flex h-8 items-center gap-2 rounded-panel px-2 hover:bg-hover">
                <button className={`min-w-0 flex-1 truncate text-left font-mono text-xs ${fileColor(item)}`} onClick={() => openItem(item)}>{item.is_dir || item.type === 'dir' ? '▸' : '•'} {item.name}</button>
                <button className="hidden text-[11px] text-faint hover:text-textc group-hover:block" onClick={() => setRenameItem(item)}>rename</button>
                <button className="hidden text-[11px] text-red group-hover:block" onClick={() => del(item)}>del</button>
              </div>
            )) : <EmptyState title="Kosong" desc="Folder kosong." />}
          </div>
        </aside>

        <main className="grid min-h-0 grid-rows-[auto_1fr]">
          <div className="flex min-h-10 items-center justify-between gap-3 border-b border-soft px-3 py-2">
            <div className="min-w-0 truncate font-mono text-xs text-dim">{opened ? opened.path : 'Pilih file untuk dibuka'}</div>
            {opened ? (
              <div className="flex gap-1.5">
                <button className="btn btn-sm" onClick={() => setEditMode((v) => !v)}>{editMode ? 'Preview' : 'Edit'}</button>
                <button className="btn btn-sm" disabled={!dirty} onClick={saveFile}><Icon name="save" className="h-3.5 w-3.5" />Save</button>
                <button className="btn btn-sm" onClick={() => archive('compress', opened)}>Zip</button>
                <button className="btn btn-sm" onClick={() => archive('extract', opened)}>Extract</button>
              </div>
            ) : null}
          </div>

          {opened ? (
            editMode ? (
              <textarea
                className="min-h-0 resize-none border-0 bg-[#090909] p-3 font-mono text-xs leading-6 text-[#d4d4d4] outline-none"
                value={content}
                onChange={(e) => { setContent(e.target.value); setDirty(true) }}
                spellCheck="false"
              />
            ) : (
              <pre className="min-h-0 overflow-auto bg-[#0c0c0c] p-3 font-mono text-xs leading-6 text-[#d4d4d4]">
                <code dangerouslySetInnerHTML={{ __html: highlightCode(content) }} />
              </pre>
            )
          ) : (
            <EmptyState title="Tidak ada file terbuka" desc="Klik file di explorer untuk membaca. Gunakan tombol Edit kalau ingin mengubah file." />
          )}
        </main>
      </div>

      {newModal ? (
        <Modal title={newModal === 'folder' ? 'Folder baru' : 'File baru'} onClose={() => setNewModal(null)}>
          <form onSubmit={createItem} className="space-y-3"><input name="name" className="input" placeholder={newModal === 'folder' ? 'nama_folder' : 'config.yml'} autoFocus /><button className="btn btn-accent w-full">Buat</button></form>
        </Modal>
      ) : null}

      {renameItem ? (
        <Modal title={`Rename ${renameItem.name}`} onClose={() => setRenameItem(null)}>
          <form onSubmit={rename} className="space-y-3"><input name="name" className="input" defaultValue={renameItem.name} autoFocus /><button className="btn btn-accent w-full">Rename</button></form>
        </Modal>
      ) : null}
    </div>
  )
}