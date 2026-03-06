-- ============================================================================
-- COMMERCE TABLES
-- Physical products, digital downloads, and order tracking
-- ============================================================================

-- Store Products table
CREATE TABLE IF NOT EXISTS store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  image_url TEXT,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  inventory_count INTEGER DEFAULT -1, -- -1 for unlimited/digital
  is_digital BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  bcba_recommended BOOLEAN DEFAULT false,
  rating NUMERIC(3, 2) DEFAULT 0.00,
  review_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_store_category CHECK (category IN (
    'books', 'toys', 'tools', 'digital-guides', 'templates', 'courses', 'sensory', 'visual-aids'
  ))
);

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_store_products_category ON store_products(category);
CREATE INDEX IF NOT EXISTS idx_store_products_featured ON store_products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_store_products_tags ON store_products USING GIN(tags);

-- Orders table
CREATE TABLE IF NOT EXISTS store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_checkout_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  amount_total NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  shipping_address JSONB,
  items JSONB NOT NULL, -- Array of product_id, quantity, price_at_time
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_order_status CHECK (status IN (
    'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  ))
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_store_orders_user ON store_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(status);

-- Enable RLS
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active products"
  ON store_products FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own orders"
  ON store_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON store_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

