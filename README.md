# Local Minecraft Server Dashboard Frontend

Frontend dashboard untuk mengontrol server Minecraft Paper lokal melalui backend FastAPI. Frontend ini dibuat dengan React + Vite dan dideploy ke Vercel, sementara backend tetap berjalan secara lokal dan diakses melalui Cloudflare Tunnel.

## Arsitektur

Vercel Frontend → Cloudflare Tunnel → FastAPI Backend Lokal → Paper Minecraft Server Lokal

## Fitur Utama

- Dashboard status server: TPS, CPU, RAM, disk, uptime, dan pemain online.
- Console server realtime dengan highlight chat player, warning, error, command, join/leave event.
- Players page dengan search, sort by, status, role/rank, health, food, level, dimension, dan position.
- Files page bergaya VS Code untuk browsing dan edit file server.
- Search file di explorer dan search isi code/config.
- Settings page untuk mengatur `server.properties`.
- Accent color bisa diganti bebas dari sidebar dan tersimpan di browser.
- Routing SPA sudah disiapkan untuk Vercel.

## Install

```bash
npm install
