const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'inventory-producer',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

async function sendEvent(event) {
  try {
    await producer.send({
      topic: 'inventory-events',
      messages: [
        {
          key: event.product_id,
          value: JSON.stringify(event)
        }
      ]
    });
    console.log('Event sent:', event);
  } catch (error) {
    console.error('Error sending event:', error);
  }
}

async function simulateTransactions() {
  await producer.connect();
  console.log('Producer connected');

  const events = [
    // Initial purchases
    {
      product_id: 'PRD001',
      event_type: 'purchase',
      quantity: 100,
      unit_price: 50.0,
      timestamp: new Date('2025-01-01T10:00:00Z').toISOString()
    },
    {
      product_id: 'PRD001',
      event_type: 'purchase',
      quantity: 50,
      unit_price: 55.0,
      timestamp: new Date('2025-01-05T10:00:00Z').toISOString()
    },
    {
      product_id: 'PRD002',
      event_type: 'purchase',
      quantity: 200,
      unit_price: 30.0,
      timestamp: new Date('2025-01-02T10:00:00Z').toISOString()
    },
    // Sales
    {
      product_id: 'PRD001',
      event_type: 'sale',
      quantity: 60,
      timestamp: new Date('2025-01-10T10:00:00Z').toISOString()
    },
    {
      product_id: 'PRD001',
      event_type: 'sale',
      quantity: 30,
      timestamp: new Date('2025-01-15T10:00:00Z').toISOString()
    },
    {
      product_id: 'PRD002',
      event_type: 'sale',
      quantity: 100,
      timestamp: new Date('2025-01-12T10:00:00Z').toISOString()
    },
    // More purchases
    {
      product_id: 'PRD001',
      event_type: 'purchase',
      quantity: 75,
      unit_price: 60.0,
      timestamp: new Date('2025-01-20T10:00:00Z').toISOString()
    },
    {
      product_id: 'PRD002',
      event_type: 'purchase',
      quantity: 150,
      unit_price: 32.0,
      timestamp: new Date('2025-01-18T10:00:00Z').toISOString()
    },
    // More sales
    {
      product_id: 'PRD001',
      event_type: 'sale',
      quantity: 50,
      timestamp: new Date('2025-01-25T10:00:00Z').toISOString()
    },
    {
      product_id: 'PRD002',
      event_type: 'sale',
      quantity: 80,
      timestamp: new Date('2025-01-22T10:00:00Z').toISOString()
    }
  ];

  console.log(`\nSending ${events.length} events...\n`);

  for (const event of events) {
    await sendEvent(event);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between events
  }

  console.log('\nAll events sent!');
  await producer.disconnect();
}

// Run if called directly
if (require.main === module) {
  simulateTransactions().catch(console.error);
}

module.exports = { sendEvent, simulateTransactions };


