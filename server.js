
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// --- Postgres ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
});

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaign_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // seed singleton if missing
  await pool.query(`
    INSERT INTO campaign_state (id, data)
    VALUES ('singleton', '{}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
  `);
};

const getState = async () => {
  const { rows } = await pool.query('SELECT data FROM campaign_state WHERE id=$1', ['singleton']);
  return rows[0]?.data || {};
};

const saveState = async (data) => {
  await pool.query(
    'UPDATE campaign_state SET data=$1, updated_at=NOW() WHERE id=$2',
    [data, 'singleton']
  );
};

// --- REST (optional) ---
app.get('/state', async (_req, res) => {
  try {
    const data = await getState();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_get_state' });
  }
});

app.post('/state', async (req, res) => {
  try {
    const data = req.body;
    await saveState(data);
    io.emit('state:apply', data); // broadcast
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_save_state' });
  }
});

// --- Socket.IO ---
io.on('connection', async (socket) => {
  console.log('client connected', socket.id);
  try {
    const data = await getState();
    socket.emit('state:apply', data); // send current state to new client
  } catch (_) {}

  socket.on('state:update', async (data) => {
    try {
      await saveState(data);
      socket.broadcast.emit('state:apply', data); // tell others
    } catch (e) {
      console.error('save failed', e);
      socket.emit('state:error', { message: 'failed_to_save_state' });
    }
  });
});

const port = process.env.PORT || 3000;
(async () => {
  await ensureSchema();
  server.listen(port, () => console.log('Realtime server on :' + port));
})();
