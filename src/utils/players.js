export function normalizePlayer(player) {
  if (typeof player === 'string') {
    return {
      name: player,
      valid: true,
      role: 'Member',
      health: null,
      food: null,
      level: null,
      dimension: null,
      position: null,
      ping: null,
      raw: player,
    }
  }

  if (player && typeof player === 'object') {
    const role = player.role
      || player.rank
      || player.group
      || player.primary_group
      || player.primaryGroup
      || player.permission_group
      || player.permissionGroup
      || player.lp_group
      || player.lpGroup
      || (player.is_op || player.op ? 'Owner' : 'Member')

    return {
      name: player.name || player.username || player.player || 'Unknown',
      valid: player.valid ?? true,
      role,
      health: player.health ?? null,
      food: player.food ?? null,
      level: player.level ?? null,
      dimension: player.dimension || player.world || null,
      position: player.position ?? null,
      ping: player.ping ?? player.latency ?? null,
      raw: player,
    }
  }

  return {
    name: String(player || 'Unknown'),
    valid: false,
    role: 'Unknown',
    health: null,
    food: null,
    level: null,
    dimension: null,
    position: null,
    ping: null,
    raw: player,
  }
}

export function formatPosition(position) {
  if (!position || typeof position !== 'object') return '-'
  const x = position.x ?? '-'
  const y = position.y ?? '-'
  const z = position.z ?? '-'
  return `${x}, ${y}, ${z}`
}

export function formatHealth(value) {
  if (value === null || value === undefined || value === '') return '-'
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  return `${Number.isInteger(n) ? n : n.toFixed(1)}/20`
}

export function formatFood(value) {
  if (value === null || value === undefined || value === '') return '-'
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  return `${Number.isInteger(n) ? n : n.toFixed(1)}/20`
}

export function searchablePlayerText(player) {
  return [
    player.name,
    player.role,
    player.dimension,
    player.valid ? 'valid' : 'invalid',
    formatPosition(player.position),
    player.health,
    player.food,
    player.level,
    player.ping,
  ]
    .filter((x) => x !== null && x !== undefined)
    .join(' ')
    .toLowerCase()
}

export function sortPlayers(players, sortBy) {
  const copy = [...players]

  const byName = (a, b) => a.name.localeCompare(b.name)
  const n = (v) => Number(v ?? -1)

  copy.sort((a, b) => {
    if (sortBy === 'role') return String(a.role || '').localeCompare(String(b.role || '')) || byName(a, b)
    if (sortBy === 'dimension') return String(a.dimension || '').localeCompare(String(b.dimension || '')) || byName(a, b)
    if (sortBy === 'health') return n(b.health) - n(a.health) || byName(a, b)
    if (sortBy === 'level') return n(b.level) - n(a.level) || byName(a, b)
    if (sortBy === 'status') return Number(b.valid) - Number(a.valid) || byName(a, b)
    return byName(a, b)
  })

  return copy
}
