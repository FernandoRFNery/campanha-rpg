
# D&D Campaign Realtime Sync (Express + Socket.IO + Postgres)

## Deploy (Render)
1. Create a new **Web Service** on Render, pick this folder.
2. Add a **PostgreSQL** instance on Render and copy its `DATABASE_URL`.
3. Set the environment variable `DATABASE_URL` on the service.
4. Build command: `npm install`
   Start command: `npm start`
5. Under "Domains", note your base URL (e.g., `https://your-app.onrender.com`).

The server exposes:
- `GET /state` → returns the latest JSON state
- `POST /state` → saves new state and broadcasts via Socket.IO
- Socket.IO namespace `/` with events:
  - client → `state:update` (payload: full state)
  - server → `state:apply`  (payload: full state)

## Client wiring
Ensure you load Socket.IO client from your server:
`<script src="/socket.io/socket.io.js"></script>`

In your page JS:
```js
// connect
const socket = io(); // if hosting client and server together
socket.on('state:apply', (data) => applyState(data));

// whenever your local save runs
socket.emit('state:update', buildState());
```
