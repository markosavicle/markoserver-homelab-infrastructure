const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5050;

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Fetch all products with category and packaging info
app.get('/api/products', async (req, res) => {
  try {
    const query = `
      SELECT p.*, c.name as category_name, pack.name as packaging_name, pack.deposit_price
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN packaging pack ON p.packaging_id = pack.id
      ORDER BY p.name ASC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch product by barcode (barcode scanner integration)
app.get('/api/products/barcode/:barcode', async (req, res) => {
  const { barcode } = req.params;
  try {
    const query = `
      SELECT p.*, pack.deposit_price
      FROM products p
      LEFT JOIN packaging pack ON p.packaging_id = pack.id
      WHERE p.barcode = $1;
    `;
    const result = await pool.query(query, [barcode]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch low stock products (Inventory alerts)
app.get('/api/products/low-stock', async (req, res) => {
  try {
    const query = 'SELECT * FROM products WHERE stock_units <= min_stock_units ORDER BY stock_units ASC;';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Checkout / Process Sale Transaction
app.post('/api/sales/checkout', async (req, res) => {
  const { items, paymentMethod } = req.body; // items: [{ productId, quantityUnits }]
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Start SQL transaction

    let totalAmount = 0;
    let totalVat = 0;
    const saleItemsToInsert = [];

    for (const item of items) {
      const productRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
      if (productRes.rows.length === 0) {
        throw new Error(`Product ID ${item.productId} not found`);
      }

      const product = productRes.rows[0];

      if (product.stock_units < item.quantityUnits) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock_units}`);
      }

      // Calculate price based on pack vs unit logic
      let itemPrice = 0;
      if (product.pack_price && product.units_in_pack > 1 && item.quantityUnits >= product.units_in_pack) {
        const fullPacks = Math.floor(item.quantityUnits / product.units_in_pack);
        const remainderUnits = item.quantityUnits % product.units_in_pack;
        itemPrice = (fullPacks * parseFloat(product.pack_price)) + (remainderUnits * parseFloat(product.unit_price));
      } else {
        itemPrice = item.quantityUnits * parseFloat(product.unit_price);
      }

      const vatAmount = itemPrice * (parseFloat(product.vat_rate) / 100);

      totalAmount += itemPrice;
      totalVat += vatAmount;

      saleItemsToInsert.push({
        productId: product.id,
        quantityUnits: item.quantityUnits,
        unitPriceApplied: product.unit_price,
        totalPrice: itemPrice,
      });

      // Deduct inventory
      await client.query(
        'UPDATE products SET stock_units = stock_units - $1 WHERE id = $2',
        [item.quantityUnits, product.id]
      );
    }

    const receiptNumber = `REC-${Date.now()}`;

    // Insert sale record
    const saleRes = await client.query(
      `INSERT INTO sales (receipt_number, total_amount, total_vat, payment_method)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [receiptNumber, totalAmount, totalVat, paymentMethod || 'CASH']
    );

    const saleId = saleRes.rows[0].id;

    // Insert sale items
    for (const sItem of saleItemsToInsert) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity_units, unit_price_applied, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [saleId, sItem.productId, sItem.quantityUnits, sItem.unitPriceApplied, sItem.totalPrice]
      );
    }

    await client.query('COMMIT'); // Commit transaction

    res.status(201).json({
      message: 'Sale completed successfully',
      receiptNumber,
      totalAmount,
      totalVat,
    });
  } catch (err) {
    await client.query('ROLLBACK'); // Rollback on failure
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.listen(port, () => {
  console.log(`Diskont POS Backend listening on port ${port}`);
});
