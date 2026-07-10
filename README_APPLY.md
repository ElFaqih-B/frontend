# craft.panel Tailwind preserve-features patch

Patch ini memakai `backup_2.zip` sebagai baseline fitur dan desain `minecraft-dashboard(2).html` sebagai arah visual.

Yang berubah:

- Bootstrap dan Bootstrap Icons dihapus dari frontend.
- Styling pindah ke Tailwind + sedikit component layer di `src/styles.css`.
- Topbar/navbar berisi accent picker, status online/offline, dan tombol Start / Restart / Stop.
- Dashboard digabung dengan console live: stat server, CPU, RAM, Java RAM, TPS, informasi server, log realtime, input command, serta dropdown/search player online.
- `Players.jsx` dibuat mobile-first card layout agar tidak horizontal scroll.
- Route `/console` masih ada agar fitur lama tidak hilang, tapi menu Console tidak ditampilkan di sidebar karena fungsinya sudah masuk Dashboard.
- Endpoint backend lama tetap dipakai: `/api/status`, `/api/players`, `/api/logs`, `/ws/console`, `/api/command`, `/api/start`, `/api/stop`, `/api/restart`.

Cara pasang:

```bash
cd ~/Documents/game/dashboard/frontend

cp -r src src_backup_before_tailwind_preserve
cp package.json package.json.backup 2>/dev/null || true

unzip -o /mnt/data/craft_panel_tailwind_preserve.zip
cp -r craft_panel_tailwind_preserve/* .

npm install
npm run dev -- --host 0.0.0.0
```

Cek build:

```bash
npm run build
```

Cek sisa Bootstrap:

```bash
grep -R "bootstrap\|bootstrap-icons\|bi-" -n src package.json
```

Kalau kosong, migrasi Bootstrap → Tailwind sudah bersih.
