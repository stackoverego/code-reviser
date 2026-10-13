const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const reminderRoutes = require('./routes/reminderRoutes');

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Enable parsing of JSON body requests
app.use(express.json());

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/reminders', reminderRoutes);

// Basic health check route
app.get('/', (req, res) => {
  res.json({ message: 'Basic Express Server is Running!' });
});

module.exports = app;
