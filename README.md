
# D&D Campaign Realtime Sync (Express + Socket.IO + Postgres)

## Deploy (Render)
1. Create a Web Service with this folder.
2. Create a PostgreSQL instance and copy the **Internal Database URL**.
3. In the service env vars, set `DATABASE_URL=<Internal DB URL>` (and `PGSSLMODE=require` if needed).
4. Build: `npm install` — Start: `npm start`.

The client is served from `/public/index.html`.
Endpoints:
- `GET /state` (returns current JSON)
- `POST /state` (saves JSON + broadcast)
- `GET /healthz` (health check)
