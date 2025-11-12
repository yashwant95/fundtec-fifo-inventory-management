-- SQL script to clear all inventory data
-- Run this using: psql -U your_user -d inventory_db -f scripts/clear-data.sql

-- Delete in order to respect foreign key constraints
DELETE FROM sales_batch_details;
DELETE FROM sales;
DELETE FROM inventory_batches;
DELETE FROM products;

-- Reset auto-increment sequences (optional, but good for clean start)
ALTER SEQUENCE products_id_seq RESTART WITH 1;
ALTER SEQUENCE inventory_batches_id_seq RESTART WITH 1;
ALTER SEQUENCE sales_id_seq RESTART WITH 1;
ALTER SEQUENCE sales_batch_details_id_seq RESTART WITH 1;

-- Verify tables are empty
SELECT 'Products count: ' || COUNT(*) FROM products;
SELECT 'Inventory batches count: ' || COUNT(*) FROM inventory_batches;
SELECT 'Sales count: ' || COUNT(*) FROM sales;
SELECT 'Sales batch details count: ' || COUNT(*) FROM sales_batch_details;

