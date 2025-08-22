# Michael Haslim Photography Print Shop

Fine art photography prints from Hawaii, featuring stunning landscapes and nature photography.

## 🌺 Features

- **Hawaii Photography Gallery** - Curated collection of fine art prints
- **Cloudflare R2 Storage** - Fast, reliable image hosting and CDN
- **Automatic Deployments** - Connected to GitHub for seamless updates
- **Next.js 15** - Modern React framework with server-side rendering
- **Vercel Hosting** - Global edge network for optimal performance
- **Stripe Integration** - Secure payment processing (when enabled)

## 🚀 Live Site

- **Production:** https://prints.michaelhaslimphoto.com
- **Vercel:** https://michael-print-shop.vercel.app
- **GitHub:** https://github.com/Slimdragon007/michael-print-shop

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React 18** - Latest React features
- **Radix UI** - Accessible component primitives

### Backend & Storage
- **Cloudflare R2** - Object storage for images and assets
- **Vercel Functions** - Serverless API endpoints
- **Stripe** - Payment processing (configurable)

### Development
- **GitHub** - Version control and collaboration
- **Vercel CLI** - Local development and deployment
- **ESLint & TypeScript** - Code quality and type safety

## 📁 Project Structure

```
├── app/                 # Next.js app router
│   ├── admin/          # Admin dashboard
│   ├── api/            # API routes
│   ├── products/       # Product pages
│   └── checkout/       # Checkout flow
├── components/          # React components
│   ├── admin/          # Admin components
│   ├── ui/             # Reusable UI components
│   └── layout/         # Layout components
├── lib/                 # Utility functions and APIs
│   ├── cloudflare-r2-api.ts  # R2 storage integration
│   └── stripe/         # Payment processing
├── public/              # Static assets
│   └── images/         # Photo gallery images
└── data/               # Photo data and configurations
    └── luxury-gallery-photos.json
```

## 🎨 Gallery Content

Features professional landscape photography from:
- **Hawaii Islands** - Dramatic coastlines and tropical landscapes
- **California** - Big Sur coastlines, Golden Gate Bridge, architectural landmarks
- **American West** - Desert landscapes, mountains, and natural formations

### Photo Categories
- **Landscape** - Natural scenery and outdoor photography
- **Architecture** - Bridges, buildings, and structural photography
- **Seascape** - Ocean, cliffs, and coastal photography

## 🚀 Development Setup

### Prerequisites
- Node.js 18+ and npm
- Vercel CLI
- GitHub CLI (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Slimdragon007/michael-print-shop.git
   cd michael-print-shop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## 📦 Deployment

### Automatic Deployment (Recommended)
1. **Push to GitHub** - Any push to the `main` branch triggers automatic deployment
2. **Vercel Integration** - Connected for seamless CI/CD
3. **Custom Domain** - Configured with prints.michaelhaslimphoto.com

### Manual Deployment
```bash
# Deploy to production
npm run build
vercel --prod

# Deploy preview
vercel
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🌐 API Endpoints

- `GET /api/products` - Fetch product catalog
- `GET /api/photos` - Fetch photo data from R2
- `POST /api/checkout` - Process checkout (Stripe)
- `GET /api/orders` - Order management

## 📱 Admin Dashboard

Access the admin panel at `/admin` for:
- Photo gallery management
- Order processing
- Content updates
- Analytics (when configured)

## 🎯 Performance Features

- **Next.js 15** - Latest performance optimizations
- **Cloudflare R2** - Global CDN for fast image loading
- **Static Generation** - Pre-rendered pages for speed
- **Image Optimization** - Automatic WebP/AVIF conversion
- **Edge Functions** - Serverless API responses

## 📄 License

© 2024 Michael Haslim Photography. All rights reserved.

---

Built with ❤️ using Next.js, TypeScript, and Cloudflare R2.