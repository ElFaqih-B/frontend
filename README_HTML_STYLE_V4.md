# MC Panel Frontend — HTML Style v4

Redesign ini mengadopsi style dari `minecraft-dashboard.html`:

- dark graphite palette
- compact flat panels
- thin borders, no glossy gradient
- sidebar + topbar feel seperti contoh HTML
- accent color picker global di topbar
- accent tersimpan di `localStorage` dengan key `panel-accent`
- tetap mempertahankan fitur frontend sebelumnya: console chat highlight, player search/sort/role, settings search server.properties, branding MOTD/icon

## Install

```bash
cd ~/Documents/game/dashboard/frontend
cp -r src src_backup_$(date +%Y%m%d_%H%M)

unzip ~/Downloads/mc_panel_frontend_html_style_v4.zip -d /tmp/mc_style_v4
rm -rf src
cp -r /tmp/mc_style_v4/frontend_html_style_v4/src ./src
cp /tmp/mc_style_v4/frontend_html_style_v4/vite.config.js ./vite.config.js
cp /tmp/mc_style_v4/frontend_html_style_v4/vercel.json ./vercel.json

npm run build
npm run dev -- --host 0.0.0.0
```

## Deploy

```bash
git add src vite.config.js vercel.json
git commit -m "adopt html dashboard style with accent picker"
git push
```
