import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

// Конфигурация пула соединений
const pool = mysql.createPool({
  port: Number(process.env.MYSQL_PORT) || 3306,
  host: process.env.MYSQL_HOST || 'mysql',
  user: process.env.MYSQL_USER || 'app_user',
  password: process.env.MYSQL_PASSWORD || 'secure_password',
  database: process.env.MYSQL_DATABASE || 'users_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Инициализация базы данных
async function initializeDatabase(maxRetries = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();

      // Создание таблицы и начальных данных
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS clickCount (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          count_value VARCHAR(255) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await pool.execute(`
        INSERT IGNORE INTO clickCount (id, count_value) VALUES (1, '0')
      `);

      console.log('Database initialized successfully');
      return;
    } catch (error) {
      console.error(`Attempt ${attempt}/${maxRetries}: Database initialization failed -`, error.message);
      
      if (attempt === maxRetries) {
        console.error('All connection attempts failed');
        process.exit(1);
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

// Маршруты API
app.get('/api/getTimestamp', (req, res) => {
  res.json({ timestamp: new Date().toISOString() });
});

app.get('/api/getCount', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clickCount');
    res.json(rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.patch('/api/count/:id', async (req, res) => {
  const { id } = req.params;
  const { count } = req.body;

  if (count === undefined || count === null) {
    return res.status(400).json({ error: 'Count field is required' });
  }

  if (isNaN(Number(count))) {
    return res.status(400).json({ error: 'Count must be a number' });
  }

  try {
    const newCount = Number(count) + 1;
    
    const [result] = await pool.execute(
      'UPDATE clickCount SET count_value = ? WHERE id = ?',
      [newCount, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const [updatedRows] = await pool.execute(
      'SELECT id, count_value FROM clickCount WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Item updated successfully',
      item: updatedRows[0] || null
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Запуск приложения
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});