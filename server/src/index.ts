import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.get('/api/getTimestamp', (req, res) => {
  res.json({ timestamp: new Date().toISOString() });
});

// Создаём пул один раз (не внутри запроса) и без require('bluebird')
const pool = mysql.createPool({
  port: Number(process.env.MYSQL_PORT) || 3306,
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'app_user',
  password: process.env.MYSQL_PASSWORD || 'secure_password',
  database: process.env.MYSQL_DATABASE || 'users_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Получение списка пользователей из MySQL
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});