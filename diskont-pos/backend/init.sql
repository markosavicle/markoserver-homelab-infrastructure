-- Categories table (Beer, Spirits, Non-alcoholic, Packaging)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Packaging and deposits table (Crates, glass bottles)
CREATE TABLE IF NOT EXISTS packaging (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    deposit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0
);

-- Store products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category_id INT REFERENCES categories(id),
    packaging_id INT REFERENCES packaging(id) ON DELETE SET NULL,
    
    -- Pricing
    unit_price NUMERIC(10, 2) NOT NULL,
    pack_price NUMERIC(10, 2),
    units_in_pack INT DEFAULT 1,
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
    
    -- Inventory
    stock_units INT NOT NULL DEFAULT 0,
    min_stock_units INT DEFAULT 20,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales receipts table
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    total_vat NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'CASH',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sale receipt items table
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INT REFERENCES sales(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    quantity_units INT NOT NULL,
    unit_price_applied NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL
);

-- Seed default categories
INSERT INTO categories (name) VALUES ('Beer'), ('Non-Alcoholic'), ('Spirits'), ('Packaging') ON CONFLICT DO NOTHING;

-- Seed default packaging types
INSERT INTO packaging (name, deposit_price, stock_quantity) VALUES 
('Beer Crate 20x0.5', 250.00, 150),
('Glass Bottle 0.5l', 15.00, 3000)
ON CONFLICT DO NOTHING;

-- Seed default products with unit and pack pricing
INSERT INTO products (barcode, name, category_id, packaging_id, unit_price, pack_price, units_in_pack, stock_units, min_stock_units) VALUES 
('860001', 'Jelen Beer 0.5l Glass', 1, 2, 95.00, 1750.00, 20, 400, 40),
('860002', 'Zajecarsko Beer 0.5l Glass', 1, 2, 90.00, 1650.00, 20, 600, 60),
('860003', 'Coca Cola 2l Pet', 2, NULL, 160.00, 900.00, 6, 120, 24)
ON CONFLICT DO NOTHING;
