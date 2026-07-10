import React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COMMAND_SUGGESTIONS } from '../constants/commands.js'
import { getJson, postJson, wsUrl } from '../api.js'
import Icon from '../components/Icons.jsx'
import SearchBar from '../components/SearchBar.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { classifyLog, normalizeLogEntry } from '../utils/logs.js'

function logClass(cls) {
  if (cls === 'error') return 'text-red border-red/60'
  if (cls === 'warn') return 'text-yellow border-yellow/60'
  if (cls === 'join') return 'text-green border-green/60'
  if (cls === 'leave') return 'text-faint border-faint/40'
  if (cls === 'chat' || cls === 'discord') return 'text-blue border-blue/60 bg-white/[0.02]'
  if (cls === 'info') return 'text-[var(--accent-text)] border-accent/60'
  return 'text-dim border-transparent'
}

export default function Console() {
  const toast = useToast()
  const conRef = useRef(null)
  const inputRef = useRef(null)
  const seenRef = useRef(new Set())
  const socketRef = useRef(null)
  const retryRef = useRef(null)
  const pingRef = useRef(null)

  const [logs, setLogs] = useState([])
  const [mode, setMode] = useState('all')
  const [query, setQuery] = useState('')
  const [badge, setBadge] = useState(['connecting...', 'border-faint text-faint'])
  const [autoScroll, setAutoScroll] = useState(true)
  const [cmd, setCmd] = useState('')
  const [history, setHistory] = useState([])
  const [hIdx, setHIdx] = useState(-1)

  const setBacklog = useCallback((arr) => {
    const normalized = (arr || []).map(normalizeLogEntry).filter((x) => x && x.line)
    seenRef.current = new Set(normalized.map((x) => x.id))
    setLogs(normalized.slice(-2000))
  }, [])

  const addEntry = useCallback((entry) => {
    if (!entry) return
    if (entry.type === 'log_history') { setBacklog(entry.logs || []); return }
    if (entry.type === 'log_line') { addEntry(entry.entry); return }
    if (entry.type === 'log_clear' || entry.type === 'clear') { seenRef.current.clear(); setLogs([]); return }
    if (entry.type === 'heartbeat' || entry.type === 'pong') return

    const normalized = normalizeLogEntry(entry)
    if (!normalized || !normalized.line || seenRef.current.has(normalized.id)) return
    seenRef.current.add(normalized.id)
    setLogs((old) => {
      const next = [...old, normalized].slice(-2000)
      if (next.length >= 2000) seenRef.current = new Set(next.map((x) => x.id))
      return next
    })
  }, [setBacklog])

  useEffect(() => {
    let alive = true
    getJson('/api/logs').then((d) => { if (alive) setBacklog(d.logs || []) }).catch(() => {})
    return () => { alive = false }
  }, [setBacklog])

  useEffect(() => {
    let manuallyClosed = false
    const connect = () => {
      const socket = new WebSocket(wsUrl('/ws/console'))
      socketRef.current = socket
      setBadge(['connecting...', 'border-faint text-faint'])
      socket.onopen = () => {
        setBadge(['connected', 'border-green text-green'])
        if (pingRef.current) clearInterval(pingRef.current)
        pingRef.current = setInterval(() => { if (socket.readyState === WebSocket.OPEN) socket.send('ping') }, 20000)
      }
      socket.onmessage = (ev) => { try { addEntry(JSON.parse(ev.data)) } catch { addEntry(String(ev.data)) } }
      socket.onerror = () => setBadge(['error', 'border-red text-red'])
      socket.onclose = () => {
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null }
        if (manuallyClosed) return
        setBadge(['reconnecting...', 'border-yellow text-yellow'])
        retryRef.current = setTimeout(connect, 1500)
      }
    }
    connect()
    return () => {
      manuallyClosed = true
      if (retryRef.current) clearTimeout(retryRef.current)
      if (pingRef.current) clearInterval(pingRef.current)
      const socket = socketRef.current
      if (socket && socket.readyState <= WebSocket.OPEN) socket.close()
    }
  }, [addEntry])

  useEffect(() => {
    if (autoScroll && conRef.current) conRef.current.scrollTop = conRef.current.scrollHeight
  }, [logs, autoScroll, mode, query])

  const visibleLogs = useMemo(() => {
    const q = query.toLowerCase()
    return logs.filter((l) => {
      const [, isChat, clean] = classifyLog(l.line)
      if (mode === 'chat' && !isChat) return false
      if (q && !clean.toLowerCase().includes(q)) return false
      return true
    })
  }, [logs, mode, query])

  const suggestions = useMemo(() => {
    const c = cmd.toLowerCase()
    return c ? COMMAND_SUGGESTIONS.filter((s) => s.startsWith(c) && s !== c).slice(0, 10) : []
  }, [cmd])

  async function sendCmd() {
    const c = cmd.trim()
    if (!c) return
    setHistory((h) => [c, ...h.filter((x) => x !== c)].slice(0, 50))
    setHIdx(-1)
    setCmd('')
    try {
      const d = await postJson('/api/command', { command: c })
      toast(d.response || d.message || 'OK', d.success ? 'success' : 'danger')
    } catch (e) { toast(e.message || 'Command gagal', 'danger') }
  }

  async function clearLogs() {
    try { await postJson('/api/logs/clear'); setLogs([]); seenRef.current.clear(); toast('Console dibersihkan', 'success') } catch (e) { toast(e.message || 'Gagal clear log', 'danger') }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') sendCmd()
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(history.length - 1, hIdx + 1)
      if (next >= 0) { setHIdx(next); setCmd(history[next] || '') }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(-1, hIdx - 1)
      setHIdx(next); setCmd(next === -1 ? '' : history[next] || '')
    }
  }

  return (
    <div className="panel flex min-h-[calc(100vh-120px)] flex-col">
      <div className="flex flex-col gap-2 border-b border-soft px-3.5 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2"><h3 className="panel-title">Console</h3><span className={`rounded border px-2 py-0.5 font-mono text-[10.5px] ${badge[1]}`}>{badge[0]}</span></div>
        <div className="flex flex-wrap gap-2">
          <button className={`btn btn-sm ${mode === 'all' ? 'btn-accent' : ''}`} onClick={() => setMode('all')}>All</button>
          <button className={`btn btn-sm ${mode === 'chat' ? 'btn-accent' : ''}`} onClick={() => setMode('chat')}>Chat</button>
          <button className="btn btn-sm" onClick={() => setAutoScroll((v) => !v)}>{autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}</button>
          <button className="btn btn-sm btn-danger" onClick={clearLogs}>Clear</button>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-b border-soft px-3.5 py-2 md:flex-row md:items-center"><SearchBar value={query} onChange={setQuery} placeholder="Search log..." className="md:max-w-md" /><span className="font-mono text-xs text-faint">{visibleLogs.length} line</span></div>
      <div ref={conRef} className="min-h-[360px] flex-1 overflow-auto bg-[#090909] p-3 font-mono text-[12px] leading-6 sm:text-[12.5px]">
        {visibleLogs.map((l) => {
          const [cls,, clean] = classifyLog(l.line)
          return <div key={l.id} className={`border-l-2 px-2 py-0.5 whitespace-pre-wrap break-words ${logClass(cls)}`}>{clean}</div>
        })}
      </div>
      <div className="relative flex items-center gap-2 border-t border-soft bg-panel px-3.5 py-2">
        <span className="font-mono text-[var(--accent-text)]">&gt;</span>
        <input ref={inputRef} className="min-h-[32px] min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-textc outline-none placeholder:text-faint" value={cmd} onChange={(e) => setCmd(e.target.value)} onKeyDown={onKeyDown} placeholder="ketik perintah server lalu Enter..." />
        <button className="btn btn-sm btn-accent" onClick={sendCmd}><Icon name="terminal" className="h-3.5 w-3.5" />Send</button>
        {suggestions.length ? <div className="absolute bottom-12 left-3 right-3 max-h-52 overflow-auto rounded-panel border border-borderc bg-raised shadow-xl sm:right-auto sm:w-[440px]">{suggestions.map((s) => <button key={s} className="block w-full px-3 py-2 text-left font-mono text-xs text-dim hover:bg-hover hover:text-textc" onClick={() => { setCmd(s); inputRef.current?.focus() }}>{s}</button>)}</div> : null}
      </div>
    </div>
  )
}
