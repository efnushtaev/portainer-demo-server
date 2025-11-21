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
  host: process.env.MYSQL_HOST || 'mysql', // changed: avoid ::1
  user: process.env.MYSQL_USER || 'app_user',
  password: process.env.MYSQL_PASSWORD || 'secure_password',
  database: process.env.MYSQL_DATABASE || 'users_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// После подключения к БД
async function ensureTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS clickCount (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        count_value VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.execute(`
        INSERT INTO clickCount (id, count_value) VALUES (1, '0');
    `);

    console.log('Users table ensured');
  } catch (error) {
    console.error('Error creating table:', error);
  }
}

const waitForDB = async (maxRetries = 30, delayMs = 2000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      console.log('MySQL connection OK');

      ensureTable();

      return true;
    } catch (err) {
      console.error(`[${i + 1}/${maxRetries}] MySQL connection failed:`, (err as Error)?.message ?? err);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  console.error('Failed to connect to MySQL after all retries');
  process.exit(1);
};

waitForDB();

// Добавлено: быстрый чек соединения при старте
(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('MySQL connection OK');
  } catch (err) {
    console.error('MySQL connection failed:', (err as Error)?.message ?? err);
  }
})();

// Получение списка пользователей из MySQL
app.get('/api/getCount', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clickCount');
    res.json(rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.patch('/api/count/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    const { count } = req.body;

    // Проверка наличия count в теле запроса
    if (count === undefined || count === null) {
      return res.status(400).json({ error: 'Count field is required' });
    }

    // Получаем соединение из пула
    connection = await pool.getConnection();

    // Обновляем count
    const [result] = await connection.execute(
      'UPDATE items SET count_value = ? WHERE id = ?',
      [count, id]
    );

    // Получаем обновленную запись
    const [updatedItems] = await connection.execute(
      'SELECT id, count_value FROM items WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Item updated successfully',
      item: updatedItems
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    // Всегда возвращаем соединение в пул
    if (connection) connection.release();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});