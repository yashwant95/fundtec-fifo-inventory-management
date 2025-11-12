# Inventory Management System (FIFO) – Real-Time Ingestion & Live Dashboard

A fully working Inventory Management Tool for a small trading business using FIFO (First-In-First-Out) costing method with real-time Kafka event processing.

## 🎯 Features

- **Real-time Event Processing**: Kafka-based event ingestion for purchases and sales
- **FIFO Costing Logic**: Accurate cost calculation using First-In-First-Out method
- **Live Dashboard**: Real-time inventory levels, costing, and transaction ledger
- **PostgreSQL Database**: Robust data storage with proper schema design
- **Authentication**: Secure login system for dashboard access
- **Auto-refresh**: Dashboard automatically updates every 5 seconds

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Kafka     │─────▶│   Backend    │─────▶│ PostgreSQL  │
│  Producer   │      │  (Express)   │      │  Database   │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Frontend   │
                     │   (React)    │
                     └──────────────┘
```

## 📋 Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL
- **Messaging**: Apache Kafka (KafkaJS)
- **Frontend**: React with Vite
- **Authentication**: JWT tokens

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Apache Kafka (or Redpanda/Confluent Cloud)

**📖 New to Kafka?** Check out the [Kafka Setup Guide](KAFKA_SETUP_GUIDE.md) for step-by-step instructions!

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fundtec-assignment
   ```

2. **Set up PostgreSQL Database**
   ```bash
   # Create database
   createdb inventory_db
   
   # Or using psql
   psql -U postgres
   CREATE DATABASE inventory_db;
   ```

3. **Set up Backend**
   ```bash
   cd backend
   npm install
   
   # Copy environment file
   cp .env.example .env
   
   # Edit .env with your database and Kafka settings
   # DATABASE_URL=postgresql://user:password@localhost:5432/inventory_db
   # KAFKA_BROKER=localhost:9092
   ```

4. **Set up Frontend**
   ```bash
   cd ../frontend
   npm install
   
   # Create .env file (optional, defaults to localhost:3001)
   # VITE_API_URL=http://localhost:3001
   ```

5. **Set up Kafka Producer**
   ```bash
   cd ../kafka-producer
   npm install
   
   # Copy environment file
   cp .env.example .env
   # Edit .env with your Kafka broker
   ```

### Running the Application

1. **Start Kafka** (if running locally)
   ```bash
   # Using Redpanda (recommended for local development)
   # Or start your Kafka cluster
   ```

2. **Start Backend**
   ```bash
   cd backend
   npm start
   # Server runs on http://localhost:3001
   ```

3. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   # Frontend runs on http://localhost:3000
   ```

4. **Run Kafka Producer** (to simulate events)
   ```bash
   cd kafka-producer
   npm start
   ```

## 📊 FIFO Logic Explanation

### How FIFO Works

FIFO (First-In-First-Out) is an inventory costing method where the oldest inventory items are sold first. This ensures that the cost of goods sold reflects the cost of the earliest purchased items.

### Implementation Details

1. **Purchase Event**:
   - Creates a new inventory batch with quantity, unit price, and timestamp
   - Batch is stored with `remaining_quantity` equal to the purchased quantity

2. **Sale Event**:
   - Retrieves all available batches for the product, ordered by purchase timestamp (oldest first)
   - Consumes batches sequentially until the sale quantity is fulfilled
   - Calculates total cost by summing: `quantity_used × unit_price` for each batch
   - Updates `remaining_quantity` for each consumed batch
   - Records sale with total cost and batch details

### Example

```
Purchase 1: 100 units @ $50.00  (Jan 1)
Purchase 2: 50 units @ $55.00   (Jan 5)
Sale: 60 units                  (Jan 10)

FIFO Calculation:
- Consume 60 units from Purchase 1 (oldest)
- Cost = 60 × $50.00 = $3,000.00
- Remaining: 40 units @ $50.00, 50 units @ $55.00
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username and password

### Inventory
- `GET /api/inventory/status` - Get inventory status for all products
- `GET /api/inventory/status/:productId` - Get inventory status for a specific product
- `GET /api/inventory/ledger` - Get transaction ledger (all purchases and sales)

## 📝 Kafka Event Format

### Purchase Event
```json
{
  "product_id": "PRD001",
  "event_type": "purchase",
  "quantity": 50,
  "unit_price": 100.0,
  "timestamp": "2025-01-12T10:00:00Z"
}
```

### Sale Event
```json
{
  "product_id": "PRD001",
  "event_type": "sale",
  "quantity": 30,
  "timestamp": "2025-01-15T10:00:00Z"
}
```

## 🗄️ Database Schema

### Tables

1. **products**: Stores product information
2. **inventory_batches**: Stores purchase batches with FIFO tracking
3. **sales**: Stores sale transactions with total cost
4. **sales_batch_details**: Tracks which batches were used for each sale

## 🎨 Frontend Features

### Dashboard Components

1. **Product Stock Overview**
   - Product ID
   - Current Quantity
   - Total Inventory Cost
   - Average Cost per Unit

2. **Transaction Ledger**
   - Time-series table of all purchases and sales
   - For sales: shows quantity, total cost, and batch details
   - Color-coded transaction types

3. **Auto-refresh**
   - Automatically updates every 5 seconds
   - Can be toggled on/off

### Login Credentials

**Default credentials:**
- Username: `admin`
- Password: `admin123`

*Note: Change these in production by setting `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables.*

## 🚢 Deployment

### Backend Deployment (Render/Railway)

1. **Set Environment Variables:**
   ```
   PORT=3001
   DATABASE_URL=<your-postgresql-connection-string>
   KAFKA_BROKER=<your-kafka-broker-url>
   JWT_SECRET=<your-secret-key>
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   ```

2. **Build Command:** (if needed)
   ```bash
   npm install
   ```

3. **Start Command:**
   ```bash
   npm start
   ```

### Frontend Deployment (Vercel/Netlify)

1. **Set Environment Variables:**
   ```
   VITE_API_URL=<your-backend-url>
   ```

2. **Build Command:**
   ```bash
   npm run build
   ```

3. **Output Directory:** `dist`

### Kafka Setup

For production, use a managed Kafka service:
- **Confluent Cloud**: https://www.confluent.io/confluent-cloud/
- **Redpanda Cloud**: https://redpanda.com/
- **AWS MSK**: Amazon Managed Streaming for Apache Kafka

Update `KAFKA_BROKER` environment variable with your Kafka broker URL.

## 🧪 Testing the System

1. **Start all services** (backend, frontend, Kafka)

2. **Login to dashboard** using default credentials

3. **Run Kafka producer** to simulate events:
   ```bash
   cd kafka-producer
   npm start
   ```

4. **Observe dashboard** - it should update automatically showing:
   - New inventory batches
   - Sales with FIFO-calculated costs
   - Updated inventory levels

## 📁 Project Structure

```
fundtec-assignment/
├── backend/
│   ├── database/
│   │   ├── schema.sql
│   │   └── db.js
│   ├── models/
│   │   ├── product.js
│   │   ├── inventoryBatch.js
│   │   └── sale.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── inventory.js
│   ├── services/
│   │   ├── fifoService.js
│   │   └── kafkaConsumer.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── Login.css
│   │   │   ├── Dashboard.jsx
│   │   │   └── Dashboard.css
│   │   ├── utils/
│   │   │   ├── auth.js
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── kafka-producer/
│   ├── producer.js
│   └── package.json
└── README.md
```

## 🔧 Troubleshooting

### Kafka Connection Issues
- Ensure Kafka broker is running and accessible
- Check `KAFKA_BROKER` environment variable
- Verify network connectivity to Kafka

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Ensure database exists and user has proper permissions

### Frontend Not Connecting to Backend
- Check `VITE_API_URL` environment variable
- Verify CORS settings in backend
- Check browser console for errors

## 📄 License

This project is created for the FundTec assignment.

## 👤 Author

Created as part of the FundTec technical assignment.

---

**Note**: This is a demonstration project. For production use, consider:
- Enhanced security (password hashing, rate limiting)
- Error handling and retry mechanisms
- Monitoring and logging
- Unit and integration tests
- Database migrations
- API documentation (Swagger/OpenAPI)

