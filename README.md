# PrintShop - Professional Photo Print E-commerce Platform

A complete e-commerce solution for selling professional photo prints with support for multiple print materials (metal, canvas, fine art paper), sizes, and customization options.

## Features

### 🛍️ E-commerce Core
- **Product Catalog**: Browse beautiful photo prints with advanced filtering
- **Shopping Cart**: Persistent cart with real-time updates
- **Checkout**: Secure payment processing with Stripe
- **User Authentication**: Complete auth system with Supabase
- **Order Management**: Track orders from purchase to delivery

### 🎨 Print Customization
- **Multiple Materials**: Metal, Canvas, Fine Art Paper
- **Various Sizes**: 8x10, 11x14, 16x20, and custom sizes
- **Dynamic Pricing**: Automatic price calculation based on material and size
- **Print Options**: Quality options for different budgets

### 🔧 Admin Features
- **Product Management**: Add, edit, and manage photo prints
- **CSV Import**: Bulk import products with AI enhancement
- **Order Processing**: Manage orders and update status
- **Analytics Dashboard**: Sales metrics and performance insights

### 🤖 AI Integration
- **Auto Descriptions**: Generate compelling product descriptions
- **Smart Tagging**: Automatic tag generation for SEO
- **Content Analysis**: AI-powered image analysis and categorization
- **Bulk Enhancement**: Improve existing product data

### 🚀 Performance & SEO
- **Next.js 14**: App Router with server components
- **Image Optimization**: Automatic WebP/AVIF conversion
- **SEO Optimized**: Meta tags, structured data, sitemap
- **Core Web Vitals**: Optimized for performance metrics

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Smooth animations
- **Zustand** - State management

### Backend
- **Supabase** - Database, Auth, and API
- **PostgreSQL** - Relational database with RLS
- **Stripe** - Payment processing
- **OpenAI** - AI-powered content generation

### Additional Tools
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Papa Parse** - CSV parsing
- **Lucide React** - Icon library

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Stripe account
- OpenAI API key (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd print-shop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_webhook_secret

   # OpenAI (optional)
   OPENAI_API_KEY=your_openai_key

   # App Settings
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_APP_NAME=Print Shop
   ADMIN_EMAIL=admin@yourprintshop.com
   ```

4. **Set up Supabase database**
   - Create a new Supabase project
   - Run the SQL schema from `lib/supabase/schema.sql`
   - Set up Row Level Security policies
   - Configure authentication providers

5. **Configure Stripe**
   - Set up webhook endpoint: `/api/webhooks/stripe`
   - Add webhook events: `checkout.session.completed`, `payment_intent.succeeded`

6. **Run the development server**
   ```bash
   npm run dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## Project Structure

```
print-shop/
├── app/                    # Next.js app router pages
│   ├── admin/             # Admin panel pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── cart/              # Shopping cart page
│   ├── checkout/          # Checkout flow
│   └── products/          # Product pages
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── cart/              # Shopping cart components
│   ├── layout/            # Layout components
│   ├── product/           # Product components
│   └── ui/                # Reusable UI components
├── lib/                   # Utility libraries
│   ├── ai/                # AI integration
│   ├── database/          # Database helpers
│   ├── stripe/            # Stripe integration
│   └── supabase/          # Supabase configuration
├── store/                 # Zustand state stores
├── types/                 # TypeScript type definitions
└── utils/                 # Helper functions
```

## Database Schema

### Core Tables
- **products** - Photo print products with metadata
- **categories** - Product categorization
- **print_options** - Material, size, and pricing options
- **orders** - Customer orders
- **order_items** - Individual items within orders
- **user_profiles** - Extended user information

### Key Features
- Row Level Security (RLS) for data protection
- Automatic triggers for updated_at timestamps
- Full-text search on products
- Optimized indexes for performance

## CSV Import Format

The system supports bulk product import via CSV with the following format:

```csv
title,description,image_url,base_price,category,tags,width,height
"Beautiful Sunset","","https://example.com/sunset.jpg",25.00,"Landscapes","sunset,nature,sky",1920,1080
"City Skyline","","https://example.com/city.jpg",30.00,"Urban","city,buildings,skyline",2048,1365
```

### Required Fields
- `title` - Product name
- `image_url` - Full URL to product image
- `base_price` - Price in dollars
- `width` - Image width in pixels  
- `height` - Image height in pixels

### Optional Fields
- `description` - Product description (can be auto-generated)
- `category` - Product category (will be created if doesn't exist)
- `tags` - Comma-separated tags (can be auto-generated)

## Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy with automatic CI/CD

### Environment Setup
- Set `NODE_ENV=production`
- Configure all environment variables
- Set up Stripe webhooks with production URLs
- Update Supabase RLS policies for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
