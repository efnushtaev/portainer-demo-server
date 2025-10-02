import React, { useState, useEffect } from 'react';

function App() {
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    const fetchTimestamp = () => {
      fetch('/api/getTimestamp')
        .then(response => response.json())
        .then(data => setTimestamp(data.timestamp));
    };

    fetchTimestamp();
    const interval = setInterval(fetchTimestamp, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Текущее время сервера:</h1>
      <p>{timestamp || 'Загрузка...'}</p>
    </div>
  );
}

export default App;