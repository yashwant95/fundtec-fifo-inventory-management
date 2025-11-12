const { pool } = require('../database/db');

class Sale {
  static async create(productId, quantity, totalCost, saleTimestamp) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const saleResult = await client.query(
        `INSERT INTO sales (product_id, quantity, total_cost, sale_timestamp) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [productId, quantity, totalCost, saleTimestamp]
      );

      await client.query('COMMIT');
      return saleResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async addBatchDetails(saleId, batchId, quantityUsed, unitCost) {
    const result = await pool.query(
      `INSERT INTO sales_batch_details (sale_id, batch_id, quantity_used, unit_cost) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [saleId, batchId, quantityUsed, unitCost]
    );
    return result.rows[0];
  }

  static async getAll() {
    const result = await pool.query(
      `SELECT s.*, 
              json_agg(
                json_build_object(
                  'batch_id', sbd.batch_id,
                  'quantity_used', sbd.quantity_used,
                  'unit_cost', sbd.unit_cost
                )
              ) as batch_details
       FROM sales s
       LEFT JOIN sales_batch_details sbd ON s.id = sbd.sale_id
       GROUP BY s.id
       ORDER BY s.sale_timestamp DESC`
    );
    return result.rows;
  }

  static async getByProduct(productId) {
    const result = await pool.query(
      `SELECT s.*, 
              json_agg(
                json_build_object(
                  'batch_id', sbd.batch_id,
                  'quantity_used', sbd.quantity_used,
                  'unit_cost', sbd.unit_cost
                )
              ) as batch_details
       FROM sales s
       LEFT JOIN sales_batch_details sbd ON s.id = sbd.sale_id
       WHERE s.product_id = $1
       GROUP BY s.id
       ORDER BY s.sale_timestamp DESC`,
      [productId]
    );
    return result.rows;
  }
}

module.exports = Sale;


