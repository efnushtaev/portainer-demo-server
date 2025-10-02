import express from 'express';
import cors from 'cors';
const app = express();
const PORT = 3001;

app.use(cors());
app.get('/api/getTimestamp', (req, res) => {
  res.json({ timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});