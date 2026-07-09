import React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getJson, postJson, wsUrl } from '../api.js'
import { COMMAND_SUGGESTIONS } from '../constants/commands.js'
import { useToast } from '../contexts/ToastContext.jsx'
import { classifyLog, normalizeLogEntry } from '../utils/logs.js'

function renderLogLine(line, cls) {
  const text = String(line || '')

  // Vanilla/Paper chat, including prefixed chat:
  // [12:00:00 INFO]: <Ken> hello
  // [12:00:00 INFO]: [Member] <Ken> hello
  const vanillaChat = text.match(/^(.*?)(<)([A-Za-z0-9_]{1,16})(>)(.*)$/)
  if (vanillaChat) {
    return (
      <>
        <span className="log-prefix">{vanillaChat[1]}{vanillaChat[2]}</span>
        <span className="log-player">{vanillaChat[3]}</span>
        <span className="log-prefix">{vanillaChat[4]}</span>
        <span className="log-message">{vanillaChat[5]}</span>
      </>
    )
  }

  // DiscordSRV style: [DiscordSRV] Chat: Ken: hello
  const discordChat = text.match(/^(.*?Chat:\s*)([A-Za-z0-9_]{1,16})(\s*[:»]\s*)(.*)$/i)
  if (discordChat) {
    return (
      <>
        <span className="log-prefix">{discordChat[1]}</span>
        <span className="log-player discord">{discordChat[2]}</span>
        <span className="log-prefix">{discordChat[3]}</span>
        <span className="log-message">{discordChat[4]}</span>
      </>
    )
  }

  // Join/leave line: Ken joined the game
  const joinLeave = text.match(/^(.*?:\s*)?([A-Za-z0-9_]{1,16})(\s+(?:joined|left) the game.*)$/i)
  if (joinLeave && (cls === 'lj-in' || cls === 'lj-out')) {
    return (
      <>
        <span className="log-prefix">{joinLeave[1] || ''}</span>
        <span className="log-player event">{joinLeave[2]}</span>
        <span className="log-message">{joinLeave[3]}</span>
      </>
    )
  }

  return text
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
  const [badge, setBadge] = useState(['connecting...', 'bg-secondary'])
  const [autoScroll, setAutoScroll] = useState(true)
  const [cmd, setCmd] = useState('')
  const [history, setHistory] = useState([])
  const [hIdx, setHIdx] = useState(-1)

  const setBacklog = useCallback((arr) => {
    const normalized = (arr || [])
      .map(normalizeLogEntry)
      .filter((x) => x && x.line)

    seenRef.current = new Set(normalized.map((x) => x.id))
    setLogs(normalized.slice(-2000))
  }, [])

  const addEntry = useCallback((entry) => {
    if (!entry) return

    if (entry.type === 'log_history') {
      setBacklog(entry.logs || [])
      return
    }

    if (entry.type === 'log_line') {
      addEntry(entry.entry)
      return
    }

    if (entry.type === 'log_clear' || entry.type === 'clear') {
      seenRef.current.clear()
      setLogs([])
      return
    }

    if (entry.type === 'heartbeat' || entry.type === 'pong') return

    const normalized = normalizeLogEntry(entry)
    if (!normalized || !normalized.line) return
    if (seenRef.current.has(normalized.id)) return

    seenRef.current.add(normalized.id)

    setLogs((old) => {
      const next = [...old, normalized].slice(-2000)
      if (next.length >= 2000) {
        seenRef.current = new Set(next.map((x) => x.id))
      }
      return next
    })
  }, [setBacklog])

  useEffect(() => {
    let alive = true

    getJson('/api/logs')
      .then((d) => {
        if (!alive) return
        setBacklog(d.logs || [])
      })
      .catch(() => {})

    return () => {
      alive = false
    }
  }, [setBacklog])

  useEffect(() => {
    let manuallyClosed = false

    const connect = () => {
      const socket = new WebSocket(wsUrl('/ws/console'))
      socketRef.current = socket
      setBadge(['connecting...', 'bg-secondary'])

      socket.onopen = () => {
        setBadge(['connected', 'bg-success'])

        if (pingRef.current) clearInterval(pingRef.current)
        pingRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send('ping')
        }, 20000)
      }

      socket.onmessage = (ev) => {
        try {
          addEntry(JSON.parse(ev.data))
        } catch {
          addEntry(String(ev.data))
        }
      }

      socket.onerror = () => setBadge(['error', 'bg-danger'])

      socket.onclose = () => {
        if (pingRef.current) {
          clearInterval(pingRef.current)
          pingRef.current = null
        }

        if (manuallyClosed) return

        setBadge(['reconnecting...', 'bg-warning text-dark'])
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
    if (autoScroll && conRef.current) {
      conRef.current.scrollTop = conRef.current.scrollHeight
    }
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
    return c
      ? COMMAND_SUGGESTIONS
        .filter((s) => s.startsWith(c) && s !== c)
        .slice(0, 10)
      : []
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
    } catch (e) {
      toast(e.message, 'danger')
    }
  }

  async function clearLog() {
    if (!window.confirm('Hapus log dari tampilan panel?')) return

    try {
      await postJson('/api/logs/clear')
    } finally {
      seenRef.current.clear()
      setLogs([])
    }
  }

  function copyLog() {
    navigator.clipboard.writeText(logs.map((x) => x.line).join('\n')).then(() => toast('Log disalin.'))
  }

  function dlLog() {
    const b = new Blob([logs.map((x) => x.line).join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = `console-${Date.now()}.log`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function onKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendCmd()
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      if (suggestions[0]) setCmd(suggestions[0])
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const ni = Math.min(hIdx + 1, history.length - 1)
      setHIdx(ni)
      setCmd(history[ni] || '')
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const ni = Math.max(hIdx - 1, -1)
      setHIdx(ni)
      setCmd(ni === -1 ? '' : history[ni] || '')
    }
  }

  return (
    <div className="panel-card console-panel">
      <div className="console-head">
        <div className="console-tabs">
          <button className={`tab-btn ${mode === 'all' ? 'active' : ''}`} onClick={() => setMode('all')}>
            All logs
          </button>
          <button className={`tab-btn ${mode === 'chat' ? 'active' : ''}`} onClick={() => setMode('chat')}>
            Chat
          </button>
        </div>

        <span className={`badge ${badge[1]}`}>{badge[0]}</span>
      </div>

      <div className="console-tools">
        <div className="input-group input-group-sm console-search">
          <span className="input-group-text border-end-0">
            <i className="bi bi-search" />
          </span>
          <input
            className="form-control border-start-0 ps-0"
            placeholder="Filter logs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="d-flex gap-2 flex-wrap ms-md-auto justify-content-end">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => setAutoScroll((x) => !x)} title="Auto Scroll">
            <i className={`bi bi-arrow-down ${autoScroll ? 'text-success' : 'text-muted'}`} />
          </button>
          <button className="btn btn-sm btn-outline-secondary" onClick={copyLog} title="Copy">
            <i className="bi bi-clipboard" />
          </button>
          <button className="btn btn-sm btn-outline-secondary" onClick={dlLog} title="Download">
            <i className="bi bi-download" />
          </button>
          <button className="btn btn-sm btn-outline-secondary text-danger" onClick={clearLog} title="Clear">
            <i className="bi bi-trash" />
          </button>
        </div>
      </div>

      <div className="p-0 position-relative">
        <div id="con" ref={conRef}>
          {visibleLogs.map((l) => {
            const [cls, isChat, clean] = classifyLog(l.line)
            return (
              <div key={l.id} className={`log-item ${cls} ${isChat ? 'is-chat' : ''}`}>
                {renderLogLine(clean, cls)}
              </div>
            )
          })}
        </div>

        <div className="terminal-footer position-relative">
          {suggestions.length > 0 && (
            <div className="sug-box">
              {suggestions.map((s) => (
                <div
                  key={s}
                  className="sug-item"
                  onClick={() => {
                    setCmd(s)
                    inputRef.current?.focus()
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          )}

          <div className="d-flex align-items-center gap-2">
            <span className="cmd-prompt">&gt;</span>
            <input
              ref={inputRef}
              className="form-control flex-grow-1 cmd-input"
              placeholder="Type a command... (Tab=autocomplete)"
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              onKeyDown={onKey}
              autoComplete="off"
              spellCheck="false"
            />
            <button className="btn btn-sm btn-outline-secondary border-0" onClick={sendCmd}>
              <i className="bi bi-send" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
