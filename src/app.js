import express from 'express';



//Environment Config Import
import config from './config/enviroment.config.js';



const app = express();

app.use('/', (req, res) => {
  res.send('hello from backend devmatch');
});

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
