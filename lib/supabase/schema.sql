-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE print_material AS ENUM ('metal', 'canvas', 'fine-art-paper');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    tags TEXT[] DEFAULT '{}',
    dimensions JSONB NOT NULL DEFAULT '{"width": 0, "height": 0}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Add constraints
    CONSTRAINT valid_dimensions CHECK (
        jsonb_typeof(dimensions) = 'object' AND
        (dimensions->>'width')::numeric > 0 AND
        (dimensions->>'height')::numeric > 0
    )
);

-- Create print_options table
CREATE TABLE IF NOT EXISTS print_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    material print_material NOT NULL,
    size VARCHAR(100) NOT NULL,
    price_modifier DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combinations per product
    UNIQUE(product_id, material, size)
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    status order_status DEFAULT 'pending',
    shipping_address JSONB NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    tracking_number VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Validate shipping address structure
    CONSTRAINT valid_shipping_address CHECK (
        jsonb_typeof(shipping_address) = 'object' AND
        shipping_address ? 'first_name' AND
        shipping_address ? 'last_name' AND
        shipping_address ? 'address_line_1' AND
        shipping_address ? 'city' AND
        shipping_address ? 'state' AND
        shipping_address ? 'postal_code' AND
        shipping_address ? 'country'
    )
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    print_option_id UUID NOT NULL REFERENCES print_options(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table to extend auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    phone VARCHAR(20),
    default_shipping_address JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_print_options_product ON print_options(product_id);
CREATE INDEX IF NOT EXISTS idx_print_options_material ON print_options(material);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Create full-text search index for products
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(
    to_tsvector('english', title || ' ' || description || ' ' || array_to_string(tags, ' '))
);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        CASE WHEN NEW.email = current_setting('app.admin_email', true) THEN 'admin' ELSE 'customer' END
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Row Level Security (RLS) Policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Categories policies (public read, admin write)
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

CREATE POLICY "Only admins can insert categories" ON categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can update categories" ON categories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Products policies (public read active, admin full access)
CREATE POLICY "Active products are viewable by everyone" ON products
    FOR SELECT USING (is_active = true OR EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Only admins can manage products" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Print options policies (follow product visibility)
CREATE POLICY "Print options follow product visibility" ON print_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE id = print_options.product_id 
            AND (is_active = true OR EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE id = auth.uid() AND role = 'admin'
            ))
        )
    );

CREATE POLICY "Only admins can manage print options" ON print_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Orders policies (users see own orders, admins see all)
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (
        user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create their own orders" ON orders
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Only admins can update orders" ON orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Order items policies (follow order access)
CREATE POLICY "Order items follow order access" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = order_items.order_id 
            AND (user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE id = auth.uid() AND role = 'admin'
            ))
        )
    );

CREATE POLICY "Order items follow order creation" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = order_id AND user_id = auth.uid()
        )
    );

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (
        id = auth.uid() OR EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND role = 'customer');

CREATE POLICY "Admins can manage all profiles" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert default categories
INSERT INTO categories (name, slug, description) VALUES
    ('Landscapes', 'landscapes', 'Beautiful landscape photography prints'),
    ('Portraits', 'portraits', 'Professional portrait photography'),
    ('Abstract', 'abstract', 'Abstract and artistic photography'),
    ('Nature', 'nature', 'Wildlife and nature photography'),
    ('Urban', 'urban', 'City and urban photography'),
    ('Black & White', 'black-white', 'Classic black and white photography')
ON CONFLICT (slug) DO NOTHING;