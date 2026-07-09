# MC Panel Frontend — CSS Concept V6

Versi ini mengadopsi konsep CSS yang diminta:

- Base Bootstrap + Bootstrap Icons + Inter + JetBrains Mono.
- Surface model: `--bg-main`, `--surface`, `--surface-2`, `--surface-3`.
- Accent system: `--accent`, `--accent-hover`, `--accent-alpha`.
- Accent picker tetap di sidebar dan bisa custom color.
- Console tetap terminal-style dengan highlight chat player.
- Players search/sort/role dan Settings search server.properties tetap dipertahankan.

Pasang aman:

```bash
cd ~/Documents/game/dashboard/frontend
cp -r src src_backup_$(date +%Y%m%d_%H%M)
unzip ~/Downloads/mc_panel_frontend_css_concept_v6.zip -d /tmp/mc_css_v6
rm -rf src
cp -r /tmp/mc_css_v6/frontend_css_concept_v6/src ./src
cp /tmp/mc_css_v6/frontend_css_concept_v6/vite.config.js ./vite.config.js
cp /tmp/mc_css_v6/frontend_css_concept_v6/vercel.json ./vercel.json
npm run build
npm run dev -- --host 0.0.0.0
```
