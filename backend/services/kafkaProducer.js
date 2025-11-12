const { Kafka } = require('kafkajs');
require('dotenv').config();

class KafkaProducerService {
  constructor() {
    const kafkaConfig = {
      clientId: 'inventory-producer',
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
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      maxInFlightRequests: 1
    });
    this.isConnected = false;
  }

  async connect() {
    if (!this.isConnected) {
      try {
        await this.producer.connect();
        this.isConnected = true;
        console.log('Kafka producer connected');
      } catch (error) {
        console.error('Error connecting Kafka producer:', error);
        throw error;
      }
    }
  }

  async sendEvent(event) {
    try {
      await this.connect();
      await this.producer.send({
        topic: 'inventory-events',
        messages: [
          {
            key: event.product_id,
            value: JSON.stringify(event)
          }
        ]
      });
      console.log('Event sent:', event);
      return true;
    } catch (error) {
      console.error('Error sending event:', error);
      throw error;
    }
  }

  async simulateTransactions() {
    const events = [
      // Initial purchases
      {
        product_id: 'PRD001',
        event_type: 'purchase',
        quantity: 100,
        unit_price: 50.0,
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
      },
      {
        product_id: 'PRD001',
        event_type: 'purchase',
        quantity: 50,
        unit_price: 55.0,
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
      },
      {
        product_id: 'PRD002',
        event_type: 'purchase',
        quantity: 200,
        unit_price: 30.0,
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() // 8 days ago
      },
      // Sales
      {
        product_id: 'PRD001',
        event_type: 'sale',
        quantity: 60,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
      },
      {
        product_id: 'PRD001',
        event_type: 'sale',
        quantity: 30,
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
        product_id: 'PRD002',
        event_type: 'sale',
        quantity: 100,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      },
      // More purchases
      {
        product_id: 'PRD001',
        event_type: 'purchase',
        quantity: 75,
        unit_price: 60.0,
        timestamp: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString() // 12 hours ago
      },
      {
        product_id: 'PRD002',
        event_type: 'purchase',
        quantity: 150,
        unit_price: 32.0,
        timestamp: new Date(Date.now() - 0.3 * 24 * 60 * 60 * 1000).toISOString() // 7 hours ago
      },
      // More sales
      {
        product_id: 'PRD001',
        event_type: 'sale',
        quantity: 50,
        timestamp: new Date(Date.now() - 0.1 * 24 * 60 * 60 * 1000).toISOString() // 2 hours ago
      },
      {
        product_id: 'PRD002',
        event_type: 'sale',
        quantity: 80,
        timestamp: new Date().toISOString() // Now
      }
    ];

    const results = [];
    for (const event of events) {
      try {
        await this.sendEvent(event);
        results.push({ success: true, event });
        // Small delay between events
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        results.push({ success: false, event, error: error.message });
      }
    }

    return results;
  }

  async disconnect() {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('Kafka producer disconnected');
    }
  }
}

module.exports = KafkaProducerService;

