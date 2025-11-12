const express = require('express');
const { initializeDatabase } = require('./database/db');
const KafkaConsumerService = require('./services/kafkaConsumer');
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'inventory-management-backend' });
});

// Initialize database and start Kafka consumer
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('Database initialized');

    // Start Kafka consumer
    const kafkaConsumer = new KafkaConsumerService();
    await kafkaConsumer.start();
    console.log('Kafka consumer started');

    // Store consumer instance for graceful shutdown
    app.locals.kafkaConsumer = kafkaConsumer;

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (app.locals.kafkaConsumer) {
    await app.locals.kafkaConsumer.stop();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (app.locals.kafkaConsumer) {
    await app.locals.kafkaConsumer.stop();
  }
  process.exit(0);
});

startServer();


