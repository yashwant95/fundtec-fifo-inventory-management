const { Kafka } = require('kafkajs');
require('dotenv').config();

async function setupKafkaTopic() {
  const kafka = new Kafka({
    clientId: 'kafka-setup',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    connectionTimeout: 30000,
    requestTimeout: 60000
  });

  const admin = kafka.admin();

  try {
    console.log('🔄 Connecting to Kafka...');
    await admin.connect();
    console.log('✅ Connected to Kafka');

    console.log('📋 Checking existing topics...');
    const topics = await admin.listTopics();
    console.log('📋 Existing topics:', topics);

    const topicName = 'inventory-events';

    if (!topics.includes(topicName)) {
      console.log(`❌ Topic '${topicName}' does not exist. Creating...`);
      await admin.createTopics({
        topics: [{
          topic: topicName,
          numPartitions: 1,
          replicationFactor: 1,
          configEntries: [
            { name: 'retention.ms', value: '604800000' }, // 7 days
            { name: 'segment.ms', value: '86400000' }     // 1 day
          ]
        }]
      });
      console.log(`✅ Topic '${topicName}' created successfully`);
    } else {
      console.log(`✅ Topic '${topicName}' already exists`);
    }

    // Verify topic details
    const topicMetadata = await admin.fetchTopicMetadata({ topics: [topicName] });
    console.log('📊 Topic metadata:', JSON.stringify(topicMetadata, null, 2));

  } catch (error) {
    console.error('❌ Error setting up Kafka topic:', error.message);
    process.exit(1);
  } finally {
    await admin.disconnect();
    console.log('🔌 Disconnected from Kafka');
  }
}

// Run setup
setupKafkaTopic().catch(console.error);