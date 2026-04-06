# Pathao Tracker - Python API

A Python Flask API for tracking Pathao parcels with real-time web scraping using Playwright.

## Features

- **Real-time Scraping**: Uses Playwright to scrape Pathao's tracking page
- **Built-in Caching**: 60-second cache to improve performance
- **Error Handling**: Graceful error responses and validation
- **CORS Support**: Cross-origin requests enabled
- **REST API**: Clean JSON API endpoints

## Quick Start

### Local Development

1. **Clone and setup:**
   ```bash
   git clone https://github.com/yourusername/pathao-tracker.git
   cd pathao-tracker
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   playwright install chromium
   ```

3. **Run the server:**
   ```bash
   python server.py
   ```

4. **Test the API:**
   ```bash
   curl -X POST http://localhost:5000/track \
     -H "Content-Type: application/json" \
     -d '{"consignment_id":"DP060426XYKJPB","phone":"01993969247"}'
   ```

## API Endpoints

### `GET /`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "message": "Pathao Tracker API is running"
}
```

### `POST /track`
Track a consignment

**Request:**
```json
{
  "consignment_id": "DP060426XYKJPB",
  "phone": "01993969247"
}
```

**Response:**
```json
{
  "consignment_id": "DP060426XYKJPB",
  "phone": "01993969247",
  "current_status": "Picked",
  "recipient_name": "SHEIKH TANVIR SIDDIKI",
  "address": "PHC 927-3 Bastala Masjid, Model School Rd, Jashore",
  "seller": "pqs.com.bd",
  "product_description": "TEAM VULCAN Z RED 8GB RAM",
  "amount": "8039",
  "timeline": [
    {
      "event": "Accepted",
      "detail": "New order pickup requested",
      "timestamp": "Apr 6, 2026 12:57 PM"
    }
  ]
}
```

## Deployment

### Render (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Deploy to Render"
   git push origin main
   ```

2. **Deploy with Render CLI:**
   ```bash
   ./deploy.sh
   ```

3. **Manual Setup:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - New Web Service → Connect GitHub
   - Build Command: `pip install -r requirements.txt && playwright install chromium`
   - Start Command: `gunicorn server:app`

### Environment Variables

- `PYTHON_VERSION`: Python version (default: 3.9)
- `PORT`: Server port (default: 5000)

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │───▶│   Flask API      │───▶│  Playwright     │
│                 │    │                  │    │  Scraper        │
│ - Next.js App   │    │ - CORS Support   │    │ - Headless      │
│ - Mobile App    │    │ - Caching        │    │   Chrome        │
│ - Postman       │    │ - Validation     │    │ - Anti-Bot      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Dependencies

- **Flask**: Web framework
- **Flask-CORS**: Cross-origin requests
- **Playwright**: Browser automation
- **Gunicorn**: WSGI server (production)

## Performance

- **Response Time**: ~3-5 seconds (with scraping)
- **Cache TTL**: 60 seconds
- **Concurrent Requests**: Limited by Playwright pool
- **Memory Usage**: ~100-200MB per instance

## Troubleshooting

### Common Issues

1. **Playwright Installation:**
   ```bash
   playwright install chromium
   ```

2. **Permission Issues:**
   ```bash
   chmod +x deploy.sh
   ```

3. **Port Conflicts:**
   - Change PORT environment variable
   - Use different port in development

### Error Codes

- `400`: Missing required fields
- `404`: Tracking data not found
- `500`: Server error (scraping failed)

## License

MIT License - feel free to use for your projects!

## Support

- Email: support@example.com
- Issues: [GitHub Issues](https://github.com/yourusername/pathao-tracker/issues)
- Docs: [Wiki](https://github.com/yourusername/pathao-tracker/wiki)
