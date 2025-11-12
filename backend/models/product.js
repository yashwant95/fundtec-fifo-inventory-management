const { pool } = require('../database/db');

class Product {
  static async findOrCreate(productId, name = null) {
    const client = await pool.connect();
    try {
      // Try to find existing product
      let result = await client.query(
        'SELECT * FROM products WHERE product_id = $1',
        [productId]
      );

      if (result.rows.length === 0) {
        // Create new product
        result = await client.query(
          'INSERT INTO products (product_id, name) VALUES ($1, $2) RETURNING *',
          [productId, name || productId]
        );
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async getAll() {
    const result = await pool.query('SELECT * FROM products ORDER BY product_id');
    return result.rows;
  }
}

module.exports = Product;


