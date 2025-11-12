const InventoryBatch = require('../models/inventoryBatch');
const Sale = require('../models/sale');

class FIFOService {
  /**
   * Process a purchase event - creates a new inventory batch
   */
  static async processPurchase(productId, quantity, unitPrice, timestamp) {
    const batch = await InventoryBatch.create(productId, quantity, unitPrice, timestamp);
    return batch;
  }

  /**
   * Process a sale event using FIFO costing
   * Consumes oldest batches first and calculates total cost
   */
  static async processSale(productId, quantity, timestamp) {
    const client = require('../database/db').pool;
    const dbClient = await client.connect();

    try {
      await dbClient.query('BEGIN');

      // Get available batches ordered by purchase timestamp (oldest first)
      const availableBatches = await InventoryBatch.getAvailableBatches(productId);

      // Check if we have enough inventory
      const totalAvailable = availableBatches.reduce(
        (sum, batch) => sum + batch.remaining_quantity,
        0
      );

      if (totalAvailable < quantity) {
        throw new Error(
          `Insufficient inventory. Available: ${totalAvailable}, Requested: ${quantity}`
        );
      }

      let remainingToSell = quantity;
      let totalCost = 0;
      const batchDetails = [];

      // Consume batches in FIFO order (oldest first)
      for (const batch of availableBatches) {
        if (remainingToSell <= 0) break;

        const quantityToUse = Math.min(remainingToSell, batch.remaining_quantity);
        const costForThisBatch = quantityToUse * parseFloat(batch.unit_price);

        // Update batch remaining quantity
        const newRemaining = batch.remaining_quantity - quantityToUse;
        await dbClient.query(
          'UPDATE inventory_batches SET remaining_quantity = $1 WHERE id = $2',
          [newRemaining, batch.id]
        );

        totalCost += costForThisBatch;
        remainingToSell -= quantityToUse;

        batchDetails.push({
          batchId: batch.id,
          quantityUsed: quantityToUse,
          unitCost: parseFloat(batch.unit_price)
        });
      }

      // Create sale record
      const sale = await dbClient.query(
        `INSERT INTO sales (product_id, quantity, total_cost, sale_timestamp) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [productId, quantity, totalCost, timestamp]
      );

      // Create batch details for this sale
      for (const detail of batchDetails) {
        await dbClient.query(
          `INSERT INTO sales_batch_details (sale_id, batch_id, quantity_used, unit_cost) 
           VALUES ($1, $2, $3, $4)`,
          [sale.rows[0].id, detail.batchId, detail.quantityUsed, detail.unitCost]
        );
      }

      await dbClient.query('COMMIT');
      return {
        sale: sale.rows[0],
        batchDetails,
        totalCost
      };
    } catch (error) {
      await dbClient.query('ROLLBACK');
      throw error;
    } finally {
      dbClient.release();
    }
  }

  /**
   * Get current inventory status for a product
   */
  static async getInventoryStatus(productId) {
    const batches = await InventoryBatch.getAllForProduct(productId);
    
    const totalQuantity = batches.reduce(
      (sum, batch) => sum + batch.remaining_quantity,
      0
    );

    const totalCost = batches.reduce(
      (sum, batch) => sum + (batch.remaining_quantity * parseFloat(batch.unit_price)),
      0
    );

    const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    return {
      productId,
      totalQuantity,
      totalCost,
      averageCost,
      batches: batches.map(b => ({
        id: b.id,
        quantity: b.remaining_quantity,
        unitPrice: parseFloat(b.unit_price),
        purchaseTimestamp: b.purchase_timestamp
      }))
    };
  }

  /**
   * Get inventory status for all products
   */
  static async getAllInventoryStatus() {
    const Product = require('../models/product');
    const products = await Product.getAll();
    
    const statuses = await Promise.all(
      products.map(product => this.getInventoryStatus(product.product_id))
    );

    return statuses;
  }
}

module.exports = FIFOService;


