export const pages = [
  ['/', 'dashboard', 'bi-speedometer2', 'Dashboard'],
  ['/console', 'console', 'bi-terminal', 'Console'],
  ['/players', 'players', 'bi-people', 'Players'],
  ['/worlds', 'worlds', 'bi-globe2', 'Worlds'],
  ['/plugins', 'plugins', 'bi-puzzle', 'Plugins'],
  ['/files', 'files', 'bi-folder2-open', 'Files'],
  ['/backups', 'backups', 'bi-archive', 'Backups'],
  ['/scheduler', 'scheduler', 'bi-calendar2-week', 'Scheduler'],

  ['/settings', 'settings', 'bi-sliders', 'Settings'],
  ['/admin-activity', 'admin-activity', 'bi-activity', 'Admin Activity'],
]

export function pageTitle(pathname) {
  const found = pages.find(([path]) => path === pathname)
  return found ? found[3] : 'Dashboard'
}
