export const pages = [
  ['/', 'dashboard', 'grid', 'Dashboard'],
  ['/players', 'players', 'users', 'Players'],
  ['/worlds', 'worlds', 'box', 'Worlds'],
  ['/plugins', 'plugins', 'plugin', 'Plugins'],
  ['/files', 'files', 'folder', 'Files'],
  ['/backups', 'backups', 'refresh', 'Backups'],
  ['/scheduler', 'scheduler', 'clock', 'Scheduler'],
  ['/settings', 'settings', 'settings', 'Settings'],
  ['/admin-activity', 'admin-activity', 'activity', 'Admin Activity'],
]

export function pageTitle(pathname) {
  if (pathname === '/console') return 'Console'
  const found = pages.find(([path]) => path === pathname)
  return found ? found[3] : 'Dashboard'
}
