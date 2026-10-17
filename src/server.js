//Environment Config Import
import config from './config/enviroment.config.js';
import app from './app.js';
import connectDB from './config/database.config.js';

const startServer = async () => {
  try {
    // 1. Connect to the database.
    await connectDB();

    // 2. If the connection succeeds, start the server.
    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  } catch (error) {
    // 3. If the connection fails, exit the process.
    console.error('Application startup failed:', error.message);
    // Exit the process with failure code (1)
    // This prevents the app from running in a broken state without a DB
    process.exit(1);
  }
};

startServer();
