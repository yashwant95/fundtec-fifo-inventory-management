const { Kafka } = require('kafkajs');
const FIFOService = require('./fifoService');
const Product = require('../models/product');
require('dotenv').config();

class KafkaConsumerService {
  constructor() {
    const kafkaConfig = {
      clientId: 'inventory-consumer',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      connectionTimeout: 30000,  // increased to 30s for AWS
      requestTimeout: 60000,  // increased to 60s for AWS
      retry: {
        retries: 10,
        initialRetryTime: 1000,
        maxRetryTime: 60000
      },
      logLevel: 1  // ERROR level only
    };

    // Add SASL authentication if credentials are provided (for Confluent Cloud)
    if (process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD) {
      kafkaConfig.sasl = {
        mechanism: 'plain',
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD
      };
      kafkaConfig.ssl = true;
    }

    this.kafka = new Kafka(kafkaConfig);
    this.consumer = this.kafka.consumer({ 
      groupId: `inventory-management-group-${Date.now()}`, // Unique group ID to avoid conflicts
      sessionTimeout: 300000,  // 5 minutes for AWS EC2
      heartbeatInterval: 10000,  // 10 seconds
      rebalanceTimeout: 120000,  // 2 minutes
      maxWaitTimeInMs: 10000,
      allowAutoTopicCreation: true,
      retry: {
        retries: 10
      }
    });
    this.isRunning = false;
  }

  async connect() {
    try {
      await this.consumer.connect();
      console.log('Kafka consumer connected');
      
      await this.consumer.subscribe({ 
        topic: 'inventory-events',
        fromBeginning: false 
      });
      
      console.log('Subscribed to topic: inventory-events');
      this.isRunning = true;
    } catch (error) {
      console.error('Error connecting to Kafka:', error);
      throw error;
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('Consumer is already running');
      return;
    }

    await this.connect();

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log('Received event:', event);

          await this.processEvent(event);
        } catch (error) {
          console.error('Error processing Kafka message:', error);
          // In production, you might want to send to a dead letter queue
        }
      }
    });
  }

  async processEvent(event) {
    const { product_id, event_type, quantity, unit_price, timestamp } = event;

    if (!product_id || !event_type || !quantity) {
      throw new Error('Invalid event: missing required fields');
    }

    const eventTimestamp = timestamp ? new Date(timestamp) : new Date();

    // Ensure product exists
    await Product.findOrCreate(product_id);

    if (event_type === 'purchase') {
      if (!unit_price) {
        throw new Error('Purchase event requires unit_price');
      }
      await FIFOService.processPurchase(
        product_id,
        quantity,
        unit_price,
        eventTimestamp
      );
      console.log(`Processed purchase: ${quantity} units of ${product_id} at ${unit_price} per unit`);
    } else if (event_type === 'sale') {
      await FIFOService.processSale(product_id, quantity, eventTimestamp);
      console.log(`Processed sale: ${quantity} units of ${product_id}`);
    } else {
      throw new Error(`Unknown event type: ${event_type}`);
    }
  }

  async stop() {
    if (this.isRunning) {
      await this.consumer.disconnect();
      this.isRunning = false;
      console.log('Kafka consumer disconnected');
    }
  }
}

module.exports = KafkaConsumerService;

