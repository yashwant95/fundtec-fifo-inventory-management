const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const authenticateToken = require('../middleware/auth');

// all routes need authentication

// get all inventory status
router.get('/status', authenticateToken, inventoryController.getAllInventoryStatus);

// get inventory status for single product
router.get('/status/:productId', authenticateToken, inventoryController.getProductInventoryStatus);

// get transaction ledger (purchases + sales)
router.get('/ledger', authenticateToken, inventoryController.getTransactionLedger);

// get all products
router.get('/products', authenticateToken, inventoryController.getAllProducts);

// get single product by id
router.get('/products/:productId', authenticateToken, inventoryController.getProduct);

// simulate kafka events for testing
router.post('/simulate-events', authenticateToken, inventoryController.simulateEvents);

// clear all data from database - supports both /clear-data and /clear-all
router.delete('/clear-data', authenticateToken, inventoryController.clearAllData);
router.delete('/clear-all', authenticateToken, inventoryController.clearAllData);

module.exports = router;

