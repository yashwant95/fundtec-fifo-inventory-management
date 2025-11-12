const { pool } = require('../database/db');

class InventoryBatch {
  static async create(productId, quantity, unitPrice, purchaseTimestamp) {
    const result = await pool.query(
      `INSERT INTO inventory_batches 
       (product_id, quantity, unit_price, remaining_quantity, purchase_timestamp) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [productId, quantity, unitPrice, quantity, purchaseTimestamp]
    );
    return result.rows[0];
  }

  static async getAvailableBatches(productId) {
    const result = await pool.query(
      `SELECT * FROM inventory_batches 
       WHERE product_id = $1 AND remaining_quantity > 0 
       ORDER BY purchase_timestamp ASC`,
      [productId]
    );
    return result.rows;
  }

  static async updateRemainingQuantity(batchId, newQuantity) {
    const result = await pool.query(
      'UPDATE inventory_batches SET remaining_quantity = $1 WHERE id = $2 RETURNING *',
      [newQuantity, batchId]
    );
    return result.rows[0];
  }

  static async getAllForProduct(productId) {
    const result = await pool.query(
      `SELECT * FROM inventory_batches 
       WHERE product_id = $1 
       ORDER BY purchase_timestamp ASC`,
      [productId]
    );
    return result.rows;
  }
}

module.exports = InventoryBatch;


