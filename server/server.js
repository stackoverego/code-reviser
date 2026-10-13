require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { initScheduler } = require('./jobs/reminderScheduler');

const PORT = 3000;

// Connect to MongoDB Database
connectDB().then(() => {
  // Start Express server only after database is connected
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    // Start the background check loop for due reminders (every 30 seconds)
    initScheduler(30000);
  });
});
