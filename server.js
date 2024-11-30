const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = 3000;
const MONGO_URI = 'mongodb+srv://user_m00886801:zkQ2rimOikUQog5i@cluster0.3gffmem.mongodb.net/'; // Replace with your MongoDB URI
const DB_NAME = 'lesson_booking'; // Replace with your database name

let db;

// Connect to MongoDB
MongoClient.connect(MONGO_URI, { useUnifiedTopology: true })
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db(DB_NAME);
  })
  .catch(error => {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  });

// Middleware to serve static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// API endpoint to get lessons
app.get('/api/lessons', async (req, res) => {
  try {
    const lessons = await db.collection('lessons').find().toArray();
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'An error occurred while fetching lessons' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
