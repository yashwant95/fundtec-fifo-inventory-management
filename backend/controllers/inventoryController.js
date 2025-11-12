const FIFOService = require('../services/fifoService');
const Sale = require('../models/sale');
const InventoryBatch = require('../models/inventoryBatch');
const Product = require('../models/product');
const KafkaProducerService = require('../services/kafkaProducer');

// Inventory controller - handles all inventory related operations
class InventoryController {
  
  // get inventory status for all products
  async getAllInventoryStatus(req, res) {
    try {
      const statuses = await FIFOService.getAllInventoryStatus();
      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      console.error('Error fetching all inventory status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory status',
        error: error.message
      });
    }
  }

  // get inventory status for specific product by id
  async getProductInventoryStatus(req, res) {
    try {
      const { productId } = req.params;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }

      const status = await FIFOService.getInventoryStatus(productId);
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error(`Error fetching inventory status for product ${req.params.productId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product inventory status',
        error: error.message
      });
    }
  }

  // get transaction ledger - shows all purchases and sales
  async getTransactionLedger(req, res) {
    try {
      // first get all products
      const products = await Product.getAll();
      const purchases = [];
      
      // loop through products and get their batches
      for (const product of products) {
        const batches = await InventoryBatch.getAllForProduct(product.product_id);
        // map batches to purchase format
        batches.forEach(batch => {
          purchases.push({
            id: batch.id,
            product_id: batch.product_id,
            event_type: 'purchase',
            quantity: batch.quantity,
            unit_price: parseFloat(batch.unit_price),
            timestamp: batch.purchase_timestamp,
            remaining_quantity: batch.remaining_quantity
          });
        });
      }

      // now get all sales
      const sales = await Sale.getAll();
      const salesFormatted = sales.map(sale => {
        return {
          id: sale.id,
          product_id: sale.product_id,
          event_type: 'sale',
          quantity: sale.quantity,
          total_cost: parseFloat(sale.total_cost),
          unit_cost: parseFloat(sale.total_cost) / sale.quantity,
          timestamp: sale.sale_timestamp,
          batch_details: sale.batch_details
        };
      });

      // combine both arrays and sort by timestamp
      const ledger = [...purchases, ...salesFormatted];
      ledger.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.json({
        success: true,
        data: ledger,
        count: ledger.length
      });
    } catch (error) {
      console.error('Error fetching transaction ledger:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch transaction ledger',
        error: error.message
      });
    }
  }

  // simulate kafka events - useful for testing
  async simulateEvents(req, res) {
    try {
      const producer = new KafkaProducerService();
      const results = await producer.simulateTransactions();
      await producer.disconnect();
      
      // count success and failures
      let successCount = 0;
      let failCount = 0;
      
      results.forEach(r => {
        if (r.success) {
          successCount++;
        } else {
          failCount++;
        }
      });
      
      res.json({
        success: true,
        message: `Simulated ${results.length} events`,
        results: {
          total: results.length,
          successful: successCount,
          failed: failCount
        },
        details: results
      });
    } catch (error) {
      console.error('Error simulating events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to simulate events',
        error: error.message
      });
    }
  }

  // get single product by id
  async getProduct(req, res) {
    try {
      const { productId } = req.params;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }

      const product = await Product.getById(productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error(`Error fetching product ${req.params.productId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product',
        error: error.message
      });
    }
  }

  // get all products list
  async getAllProducts(req, res) {
    try {
      const products = await Product.getAll();
      res.json({
        success: true,
        data: products,
        count: products.length
      });
    } catch (error) {
      console.error('Error fetching all products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch products',
        error: error.message
      });
    }
  }

  // clear all data from database
  async clearAllData(req, res) {
    try {
      const { pool } = require('../database/db');
      
      // delete all sales first (foreign key constraint)
      await pool.query('DELETE FROM sales');
      console.log('Cleared sales table');
      
      // then delete inventory batches
      await pool.query('DELETE FROM inventory_batches');
      console.log('Cleared inventory_batches table');
      
      // finally delete products
      await pool.query('DELETE FROM products');
      console.log('Cleared products table');
      
      res.json({
        success: true,
        message: 'All data cleared successfully',
        tablesCleared: ['sales', 'inventory_batches', 'products']
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear data',
        error: error.message
      });
    }
  }
}

module.exports = new InventoryController();
