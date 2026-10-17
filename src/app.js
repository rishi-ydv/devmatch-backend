import express from 'express';

const app = express();

app.use('/', (req, res) => {
  res.send('hello from backend devmatch');
});

app.listen(8080, () => {
  console.log('Server is running on port 8080');
});
