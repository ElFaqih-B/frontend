export function classifyLog(rawLine) {
  const cleanLine = String(rawLine || '').replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
  if (cleanLine.includes('[DiscordSRV] Chat:')) return ['discord', true, cleanLine]
  if (cleanLine.includes('[WEB] say ') || cleanLine.includes('[WEB] broadcast ')) return ['chat', true, cleanLine]
  if (cleanLine.includes('[Server]') || cleanLine.includes('[CONSOLE]') || cleanLine.includes('[Broadcast]') || cleanLine.includes('[Rcon]')) return ['chat', true, cleanLine]
  if (/\]:\s*(?:\[[^\]]+\]\s*)*<[^>]+>/.test(cleanLine)) return ['chat', true, cleanLine]
  if (cleanLine.includes(' joined the game')) return ['join', true, cleanLine]
  if (cleanLine.includes(' left the game')) return ['leave', true, cleanLine]
  if (cleanLine.includes('[WEB]') || cleanLine.startsWith('>>> ')) return ['info', false, cleanLine]
  if (cleanLine.includes('ERROR') || cleanLine.includes('Exception')) return ['error', false, cleanLine]
  if (cleanLine.includes('WARN')) return ['warn', false, cleanLine]
  return ['plain', false, cleanLine]
}

export function normalizeLogEntry(entry) {
  if (typeof entry === 'string') return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, line: entry }
  if (!entry || typeof entry !== 'object') return null
  return { id: entry.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`, line: entry.line ?? entry.message ?? '', ts: entry.ts }
}
