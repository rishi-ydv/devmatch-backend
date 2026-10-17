import express from 'express';

const app = express();

app.use('/', (req, res) => {
  res.send('hello from backend devmatch');
});


export default app;

