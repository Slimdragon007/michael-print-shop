# 🚀 Supabase Setup Guide

## Step 1: Get Your Supabase Credentials

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Create a new project or select your existing project
3. Go to **Settings → API** in your Supabase dashboard
4. Copy these values:
   - **Project URL**: `https://[YOUR-PROJECT-REF].supabase.co`
   - **Anon/Public Key**: `eyJ...` (long string)
   - **Service Role Key**: `eyJ...` (different long string - keep this secret!)

## Step 2: Update Your Environment Variables

Edit `.env.local` and replace the placeholders:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
```

## Step 3: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste this entire schema:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    tags TEXT[],
    dimensions VARCHAR(50),
    featured BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Print options table
CREATE TABLE IF NOT EXISTS print_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    material VARCHAR(50) NOT NULL, -- 'metal', 'canvas', 'fine-art-paper'
    size VARCHAR(50) NOT NULL, -- '8x10', '16x20', '24x36', etc.
    price_modifier DECIMAL(10, 2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Users extended profile (Supabase Auth handles base users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2) DEFAULT 'US',
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) DEFAULT 0,
    shipping DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    stripe_session_id VARCHAR(255),
    shipping_address JSONB,
    tracking_number VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    print_option_id UUID REFERENCES print_options(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    product_snapshot JSONB, -- Store product details at time of order
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Wishlist table
CREATE TABLE IF NOT EXISTS wishlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, product_id)
);

-- Cart items table (for persistent carts)
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    print_option_id UUID REFERENCES print_options(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX idx_products_active ON products(active) WHERE active = true;
CREATE INDEX idx_products_title_search ON products USING gin(to_tsvector('english', title));
CREATE INDEX idx_products_description_search ON products USING gin(to_tsvector('english', description));
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create order number generation function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Public read access for products and categories
CREATE POLICY "Products are viewable by everyone" ON products
    FOR SELECT USING (active = true);

CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

CREATE POLICY "Print options are viewable by everyone" ON print_options
    FOR SELECT USING (true);

-- User profile policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Order policies
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Order items policies
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- Wishlist policies
CREATE POLICY "Users can manage own wishlist" ON wishlists
    FOR ALL USING (auth.uid() = user_id);

-- Cart policies
CREATE POLICY "Users can manage own cart" ON cart_items
    FOR ALL USING (auth.uid() = user_id);

-- Insert sample categories
INSERT INTO categories (name, slug, description) VALUES
('Landscape', 'landscape', 'Stunning landscape photography from around the world'),
('Nature', 'nature', 'Beautiful nature and wildlife photography'),
('Urban', 'urban', 'City life and architectural photography'),
('Seascape', 'seascape', 'Ocean, beach, and coastal photography'),
('Wildlife', 'wildlife', 'Amazing wildlife and animal photography'),
('Astrophotography', 'astrophotography', 'Stars, galaxies, and night sky photography');

-- Create admin user trigger (optional)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name, is_admin)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        CASE 
            WHEN NEW.email = 'admin@michaelhaslimphoto.com' THEN true
            ELSE false
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
```

4. Click **Run** to create all tables and policies

## Step 4: Enable Authentication

1. Go to **Authentication → Providers** in Supabase
2. Enable **Email** provider
3. Optionally enable social providers (Google, GitHub, etc.)

## Step 5: Configure Storage (for image uploads)

1. Go to **Storage** in Supabase
2. Create a new bucket called `products`
3. Set it to **Public** if you want images accessible without authentication
4. Update the bucket policies:

```sql
-- Allow public read access to product images
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'products');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
```

## Step 6: Test Your Connection

1. Restart your development server:
```bash
npm run dev
```

2. Visit http://localhost:3000
3. Try creating an account or signing in
4. Check the browser console for any errors

## Troubleshooting

- **"Invalid API key"**: Double-check your Supabase keys in `.env.local`
- **"Table not found"**: Make sure you ran the SQL schema in step 3
- **Connection errors**: Verify your Supabase project URL is correct
- **Auth errors**: Check that email provider is enabled in Supabase

## Need Your API Keys?

Share your Supabase project URL and anon key (NOT the service role key), and I'll help you configure everything!