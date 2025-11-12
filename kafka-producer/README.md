# Kafka Event Producer - Inventory Management System

## 📋 Overview

This is the Kafka event producer/simulator for the Inventory Management System. It generates sample purchase and sale events that are consumed by the backend to demonstrate real-time inventory processing with FIFO costing.

---

## 🎯 FIFO Logic Brief

**FIFO (First-In-First-Out)** is an inventory costing method where the oldest inventory items are sold first.

### How It Works:

1. **Purchase Event** → Creates a new inventory batch with:
   - Product ID
   - Quantity
   - Unit Price
   - Purchase Timestamp

2. **Sale Event** → Consumes oldest batches first:
   - Finds the oldest batch (by purchase timestamp)
   - Takes required quantity from that batch
   - If one batch isn't enough, moves to the next oldest
   - Calculates total cost based on batches consumed

### Example:

```
📦 Purchase 1: 100 units @ ₹50 (Jan 1)
📦 Purchase 2: 50 units @ ₹55 (Jan 5)

💰 Sale: 120 units
   ├─ Takes 100 from Purchase 1 @ ₹50 = ₹5,000
   └─ Takes 20 from Purchase 2 @ ₹55 = ₹1,100
   Total Cost: ₹6,100
```

The system automatically tracks which batches were used for each sale, providing complete transparency in cost calculations.

---

## 🚀 How to Run the Producer Locally

### Prerequisites

- Node.js (v16 or higher)
- Kafka/Redpanda running on `localhost:9092`

### Setup

1. **Install dependencies:**
```bash
cd kafka-producer
npm install
```

2. **Configure Kafka broker** (optional):

If your Kafka is running on a different host/port, create a `.env` file:
```env
KAFKA_BROKER=localhost:9092
```

For cloud Kafka (Confluent, Upstash), add SASL credentials:
```env
KAFKA_BROKER=pkc-xxxxx.region.confluent.cloud:9092
KAFKA_SASL_USERNAME=your-api-key
KAFKA_SASL_PASSWORD=your-api-secret
```

### Run the Producer

**Method 1: Run Simulation Script**
```bash
npm start
```

This will:
- Connect to Kafka
- Send 10 pre-configured events (5 purchases, 5 sales)
- Show confirmation for each event
- Disconnect when done

**Method 2: Run Individual Events**

You can modify `producer.js` to send custom events:

```javascript
const event = {
  product_id: 'PRD001',
  event_type: 'purchase',
  quantity: 100,
  unit_price: 50.0,
  timestamp: new Date().toISOString()
};

await sendEvent(event);
```

### Sample Events Sent

The simulator sends these events in order:

1. **PRD001**: Purchase 100 units @ ₹50
2. **PRD001**: Purchase 50 units @ ₹55
3. **PRD002**: Purchase 200 units @ ₹30
4. **PRD001**: Sale 60 units (uses oldest batch)
5. **PRD001**: Sale 30 units
6. **PRD002**: Sale 100 units
7. **PRD001**: Purchase 75 units @ ₹60
8. **PRD002**: Purchase 150 units @ ₹32
9. **PRD001**: Sale 50 units
10. **PRD002**: Sale 80 units

---

## 📡 Event Format

### Purchase Event
```json
{
  "product_id": "PRD001",
  "event_type": "purchase",
  "quantity": 100,
  "unit_price": 50.0,
  "timestamp": "2025-01-01T10:00:00Z"
}
```

### Sale Event
```json
{
  "product_id": "PRD001",
  "event_type": "sale",
  "quantity": 60,
  "timestamp": "2025-01-10T10:00:00Z"
}
```

**Note:** Sale events don't include `unit_price` - the cost is calculated by the backend using FIFO.

---

## 🔗 Project Links

### 🌐 Live Deployment
- **Frontend Dashboard**: [Add your Vercel URL here]
- **Backend API**: [Add your Render URL here]

### 💻 GitHub Repository
- **Main Repository**: [Add your GitHub repo URL here]

### 🔑 Login Credentials
- **Username**: `admin`
- **Password**: `admin123`

---

## 🛠️ Troubleshooting

### Issue: Connection Refused (ECONNREFUSED)

**Cause:** Kafka is not running or wrong broker address

**Solution:**
```bash
# For Docker Kafka
docker ps | grep kafka

# For Redpanda
rpk cluster info

# Check your KAFKA_BROKER environment variable
```

### Issue: Topic Does Not Exist

**Cause:** The `inventory-events` topic hasn't been created

**Solution:**
```bash
# For Docker Kafka
docker exec -it <kafka-container> kafka-topics --create --topic inventory-events --bootstrap-server localhost:9092

# For Redpanda
rpk topic create inventory-events
```

### Issue: Authentication Failed

**Cause:** Using cloud Kafka without SASL configuration

**Solution:** Update `producer.js` to include SASL:

```javascript
const kafka = new Kafka({
  clientId: 'inventory-producer',
  brokers: [process.env.KAFKA_BROKER],
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_SASL_USERNAME,
    password: process.env.KAFKA_SASL_PASSWORD
  },
  ssl: true
});
```

---

## 📊 Verifying Events

After running the producer, you can verify events were sent:

**Check Backend Logs:**
```
Received event: { product_id: 'PRD001', event_type: 'purchase', ... }
Processed purchase: 100 units of PRD001 at 50 per unit
```

**Check Dashboard:**
- Login to the frontend
- Check Product Stock Overview for inventory
- Check Transaction Ledger for events
- Click "View Batches" on sales to see FIFO breakdown

**Check Database:**
```sql
SELECT * FROM inventory_batches;
SELECT * FROM sales;
SELECT * FROM sales_batch_details;
```

---

## 🎓 Understanding the Output

When you run the producer, you'll see:

```
Producer connected
Event sent: { product_id: 'PRD001', event_type: 'purchase', quantity: 100, unit_price: 50, ... }
Event sent: { product_id: 'PRD001', event_type: 'purchase', quantity: 50, unit_price: 55, ... }
...
All events sent successfully
Producer disconnected
```

These events are:
1. Sent to Kafka topic `inventory-events`
2. Consumed by backend Kafka consumer
3. Processed using FIFO logic
4. Stored in PostgreSQL database
5. Displayed on the frontend dashboard

---

## 📚 Additional Resources

- **Kafka Documentation**: https://kafka.apache.org/documentation/
- **KafkaJS Library**: https://kafka.js.org/
- **FIFO Costing**: https://www.investopedia.com/terms/f/fifo.asp

---

## 🤝 Contributing

This is an assignment project. For the main application documentation, see the root `README.md`.

---

**Last Updated**: November 2025
