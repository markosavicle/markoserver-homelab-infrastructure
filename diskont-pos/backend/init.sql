-- Create categories table (Beer, Spirits, Non-alcoholic, Packaging)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Create packaging and deposits table (Crates, glass bottles)
CREATE TABLE IF NOT EXISTS packaging (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    deposit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0
);

-- Create store products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category_id INT REFERENCES categories(id),
    packaging_id INT REFERENCES packaging(id) ON DELETE SET NULL,
    
    -- Pricing structure
    unit_price NUMERIC(10, 2) NOT NULL,
    pack_price NUMERIC(10, 2),
    units_in_pack INT DEFAULT 1,
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
    
    -- Inventory tracking
    stock_units INT NOT NULL DEFAULT 0,
    min_stock_units INT DEFAULT 20,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sales receipts table
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    total_vat NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'CASH',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sale receipt items table
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INT REFERENCES sales(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    quantity_units INT NOT NULL,
    unit_price_applied NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL
);

-- Seed default categories for beverage discount store
INSERT INTO categories (id, name) VALUES 
(1, 'Beer'), 
(2, 'Non-Alcoholic'), 
(3, 'Spirits'), 
(4, 'Wine & Cider'),
(5, 'Packaging & Deposits') 
ON CONFLICT (id) DO NOTHING;

-- Seed packaging types (Crates and returnable glass bottles)
INSERT INTO packaging (id, name, deposit_price, stock_quantity) VALUES 
(1, 'Beer Crate 20x0.5l', 250.00, 200),
(2, 'Glass Bottle 0.5l', 15.00, 5000),
(3, 'Glass Bottle 0.33l', 12.00, 2000)
ON CONFLICT (id) DO NOTHING;

-- Seed realistic store product catalog with pack discounts and returnable packaging references
INSERT INTO products (barcode, name, category_id, packaging_id, unit_price, pack_price, units_in_pack, stock_units, min_stock_units) VALUES 
-- Domestic & Regional Beers (Glass - Returnable)
('860001', 'Jelen Pivo 0.5l Glass', 1, 2, 95.00, 1750.00, 20, 500, 40),
('860002', 'Zaječarsko Pivo 0.5l Glass', 1, 2, 90.00, 1650.00, 20, 600, 60),
('860003', 'Lav Pivo 0.5l Glass', 1, 2, 88.00, 1620.00, 20, 350, 40),
('860004', 'Nikšićko Pivo 0.5l Glass', 1, 2, 98.00, 1800.00, 20, 400, 40),

-- Premium & Imported Beers (Cans & Non-returnable Glass)
('860005', 'Heineken 0.5l Can', 1, NULL, 135.00, 2900.00, 24, 288, 48),
('860006', 'Tuborg Green 0.5l Can', 1, NULL, 115.00, 2500.00, 24, 240, 48),
('860007', 'Paulaner Weissbier 0.5l Glass', 1, NULL, 220.00, 4100.00, 20, 100, 20),

-- Non-Alcoholic Beverages & Juices
('860008', 'Coca Cola 2.0l PET', 2, NULL, 165.00, 930.00, 6, 180, 30),
('860009', 'Fanta Orange 2.0l PET', 2, NULL, 165.00, 930.00, 6, 120, 24),
('860010', 'Knjaz Miloš Carbonated Water 1.5l', 2, NULL, 65.00, 360.00, 6, 300, 60),
('860011', 'Rosa Still Water 1.5l', 2, NULL, 60.00, 330.00, 6, 240, 48),
('860012', 'Next Apple Juice 1.0l TetraPak', 2, NULL, 140.00, 1550.00, 12, 96, 24),

-- Spirits & Hard Liquor
('860013', 'Gorki List Pelinkovac 1.0l', 3, NULL, 1250.00, NULL, 1, 45, 10),
('860014', 'Rubin Vinjak 1.0l', 3, NULL, 1100.00, NULL, 1, 50, 10),
('860015', 'Johnnie Walker Red Label 0.7l', 3, NULL, 1850.00, NULL, 1, 30, 5),
('860016', 'Smirnoff Vodka 0.7l', 3, NULL, 1450.00, NULL, 1, 25, 5),

-- Wines
('860017', 'Tikveš Smederevka 1.0l Glass', 4, NULL, 380.00, 2150.00, 6, 84, 18),
('860018', 'Plantaže Vranac 1.0l Glass', 4, NULL, 450.00, 2550.00, 6, 90, 18)
ON CONFLICT (barcode) DO NOTHING;