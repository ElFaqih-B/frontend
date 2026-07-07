export const pages = [
  ['/', 'dashboard', 'bi-grid', 'Dashboard'],
  ['/console', 'console', 'bi-terminal', 'Console'],
  ['/players', 'players', 'bi-people', 'Players'],
  ['/worlds', 'worlds', 'bi-globe2', 'Worlds'],
  ['/plugins', 'plugins', 'bi-puzzle', 'Plugins'],
  ['/files', 'files', 'bi-folder2', 'Files'],
  ['/backups', 'backups', 'bi-archive', 'Backups'],
  ['/scheduler', 'scheduler', 'bi-clock', 'Scheduler'],
  ['/settings', 'settings', 'bi-sliders', 'Settings'],
]

export function pageTitle(pathname) {
  const found = pages.find(([path]) => path === pathname)
  return found ? found[3] : 'Panel'
}
