# Pathao Tracker - Next.js Version

A modern Pathao parcel tracking application built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🚀 **Modern Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS
- 🎨 **Premium UI**: Dark theme with yellow accents matching Pathao branding
- 📱 **Responsive Design**: Works perfectly on desktop and mobile
- ⚡ **Fast Performance**: Optimized for Vercel deployment
- 🔍 **Real-time Tracking**: Mock tracking data for demonstration
- 💾 **Built-in Caching**: 60-second cache for performance

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run development server**
   ```bash
   npm run dev
   ```

3. **Open [http://localhost:3000](http://localhost:3000)**

## Deployment to Vercel

### Option 1: GitHub Integration (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy Pathao Tracker to Vercel"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Click "Deploy"

### Option 2: Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

## Environment Variables

For production, you may want to add:

```bash
# For real scraping service (optional)
PYTHON_SERVER_URL=https://your-api-server.com
```

## Project Structure

```
pathao-tracker-nextjs/
├── src/
│   └── app/
│       ├── api/
│       │   └── track/          # Custom API route
│       ├── page.tsx            # Main tracking page
│       └── layout.tsx          # App layout
├── public/                     # Static assets
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## API Endpoints

- `POST /api/track` - Track a consignment
- `GET /api/track` - API information

## Mock Data

Currently uses mock tracking data for demonstration. To integrate with real tracking:

1. Replace mock data in `src/app/api/track/route.ts`
2. Use a scraping service like Apify or ScraperAPI
3. Or integrate with Pathao's official API

## Technologies Used

- **Next.js 16** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vercel** - Hosting platform

## License

MIT License - feel free to use this project for your own tracking needs!
