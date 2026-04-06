import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for development
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

async function scrapePathaoReal(consignmentId: string, phone: string) {
  // Try multiple Pathao tracking URLs
  const urls = [
    `https://merchant.pathao.com/tracking?consignment_id=${consignmentId}&phone=${phone}`,
    `https://pathao.com/tracking?consignment_id=${consignmentId}&phone=${phone}`,
    `https://www.pathao.com/tracking?consignment_id=${consignmentId}&phone=${phone}`
  ];
  
  try {
    // Use ScrapingBee API for real scraping
    const apiKey = process.env.SCRAPINGBEE_API_KEY || 'TBPD48FCAT5A3FBJAE5FUJ6KK4WNY5YUMBMROPWMDWZZ04HXSE70H3RV6GMAVC7VG64GD18SIYXYKUGA';
    
    for (const url of urls) {
      try {
        console.log(`Trying URL: ${url}`);
        
        // Use ScrapingBee with simpler configuration
        const scrapingUrl = `https://app.scrapingbee.com/api/v1/?api_key=${apiKey}&url=${encodeURIComponent(url)}&render_js=true&wait_for=3000&premium_proxy=true`;
        
        const response = await fetch(scrapingUrl);
        
        if (!response.ok) {
          console.log(`Failed with status: ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        if (data.status === 'error') {
          console.log(`ScrapingBee error: ${data.error}`);
          continue;
        }

        const result = parsePathaoHTML(data.html || '', consignmentId, phone);
        
        // Check if we got meaningful data
        if (result.current_status !== 'Unknown' || result.timeline.length > 0) {
          return result;
        }
        
      } catch (urlError) {
        console.log(`URL ${url} failed:`, urlError);
        continue;
      }
    }
    
    // If all URLs failed, return simulated data for demo purposes
    console.log('All URLs failed, returning simulated data for demo...');
    return getSimulatedData(consignmentId, phone);
    
  } catch (error) {
    console.error('Real scraping error:', error);
    return getSimulatedData(consignmentId, phone);
  }
}

function getSimulatedData(consignmentId: string, phone: string) {
  // Generate realistic simulated data based on consignment ID pattern
  const lastChar = consignmentId.slice(-1).toLowerCase();
  const statuses = ['Accepted', 'Picked', 'In Transit', 'Ready for Delivery', 'Delivered'];
  const statusIndex = Math.min(parseInt(lastChar, 36) % 5, 4);
  const currentStatus = statuses[statusIndex];
  
  const recipients = [
    'MD. RAHIM UDDIN',
    'FARHANA AKTER', 
    'SHEIKH TANVIR SIDDIKI',
    'KARIM AHMED',
    'JASMINA BEGUM'
  ];
  
  const addresses = [
    'House 12, Road 5, Dhanmondi, Dhaka-1205',
    'Flat 3B, Building 7, Mirpur 10, Dhaka-1216',
    'PHC 927-3 Bastala Masjid, Model School Rd, Jashore',
    'Block A, Apartment 4, Gulshan 1, Dhaka-1212',
    'Shop 12, Market Complex, Uttara, Dhaka-1230'
  ];
  
  const sellers = [
    'daraz.com.bd',
    'pqs.com.bd', 
    'chaldal.com',
    'pickaboo.com',
    'bagdoom.com'
  ];
  
  const products = [
    'Samsung Galaxy A54 5G 8GB RAM 256GB Storage - Awesome Violet',
    'TEAM VULCAN Z RED 8GB 3200 MHz CL16-20-20-40 DDR4 Desktop RAM',
    'Fresh Vegetables and Fruits Package - 5kg assortment',
    'Apple iPhone 15 Pro 256GB Natural Titanium',
    'HP Laptop 15-fd0034dx with AMD Ryzen 5 Processor'
  ];
  
  const amounts = ['45000', '8039', '1200', '125000', '65000'];
  
  const recipientIndex = parseInt(consignmentId.slice(-2), 36) % recipients.length;
  const now = new Date();
  
  // Generate timeline based on current status
  const timeline = [];
  const baseDate = new Date(now.getTime() - (4 - statusIndex) * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i <= statusIndex; i++) {
    const eventDate = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    timeline.push({
      event: statuses[i],
      detail: getEventDetail(statuses[i]),
      timestamp: eventDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }) + ' ' + eventDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
    });
  }
  
  return {
    consignment_id: consignmentId,
    phone: phone,
    current_status: currentStatus,
    recipient_name: recipients[recipientIndex],
    address: addresses[recipientIndex],
    seller: sellers[recipientIndex],
    product_description: products[recipientIndex],
    amount: amounts[recipientIndex],
    timeline: timeline,
    _simulated: true,
    note: 'This is simulated data for demonstration. Real scraping failed.'
  };
}

function getEventDetail(status: string): string {
  const details: { [key: string]: string } = {
    'Accepted': 'Order has been received and confirmed',
    'Picked': 'Package has been picked up from seller',
    'In Transit': 'Package is currently in transit to destination',
    'Ready for Delivery': 'Package has arrived at local delivery hub',
    'Delivered': 'Package has been successfully delivered to recipient'
  };
  return details[status] || '';
}

function parsePathaoHTML(html: string, consignmentId: string, phone: string) {
  const result: any = {
    consignment_id: consignmentId,
    phone: phone,
    current_status: 'Unknown',
    recipient_name: '',
    address: '',
    seller: '',
    product_description: '',
    amount: '',
    timeline: []
  };

  try {
    // Extract current status from the page
    const statusPatterns = [
      { pattern: /Delivered/i, status: 'Delivered' },
      { pattern: /Ready for Delivery/i, status: 'Ready for Delivery' },
      { pattern: /In Transit/i, status: 'In Transit' },
      { pattern: /Picked/i, status: 'Picked' },
      { pattern: /Accepted/i, status: 'Accepted' }
    ];
    
    for (const { pattern, status } of statusPatterns) {
      if (pattern.test(html)) {
        result.current_status = status;
        break;
      }
    }

    // Extract recipient name - look for common patterns
    const recipientPatterns = [
      /Recipient[:\s]+([A-Z\s]+)/i,
      /Name[:\s]+([A-Z\s]+)/i,
      /([A-Z]+\s+[A-Z]+)(?=\s*(?:Phone|Mobile|Address))/i
    ];
    
    for (const pattern of recipientPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].trim().length > 3) {
        result.recipient_name = match[1].trim();
        break;
      }
    }

    // Extract address
    const addressPatterns = [
      /Address[:\s]+([^\n]+)/i,
      /(PHC\s+\d+[^<\n]*)/i,
      /(House\s+\d+[^<\n]*)/i,
      /(\d+\s+[A-Z][a-z]+\s+(?:Road|Rd|Street|St)[^<\n]*)/i
    ];
    
    for (const pattern of addressPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].trim().length > 10) {
        result.address = match[1].trim();
        break;
      }
    }

    // Extract seller
    const sellerPatterns = [
      /Seller[:\s]+([a-zA-Z0-9\.\-]+\.(?:com|bd|net|org)[^\s]*)/i,
      /([a-zA-Z0-9\.\-]+\.(?:com|bd|net|org)[^\s]*?)(?=\s|$)/i
    ];
    
    for (const pattern of sellerPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        result.seller = match[1].trim();
        break;
      }
    }

    // Extract product description
    const productPatterns = [
      /Product[:\s]+([^<\n]+)/i,
      /Item[:\s]+([^<\n]+)/i,
      /([A-Z]{2,}.*?(?:GB|MHz|TB|RAM|SSD|CPU|GPU)[^<\n]*)/i
    ];
    
    for (const pattern of productPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].trim().length > 5) {
        result.product_description = match[1].trim();
        break;
      }
    }

    // Extract amount
    const amountPatterns = [
      /Amount[:\s]*([৳\$\d,]+)/i,
      /Price[:\s]*([৳\$\d,]+)/i,
      /([৳]\s*[\d,]+)/i,
      /(\d{1,6})/i
    ];
    
    for (const pattern of amountPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        result.amount = match[1].replace(/[৳\$\s,]/g, '');
        break;
      }
    }

    // Extract timeline events
    const timelinePattern = /<(?:h3|div|span)[^>]*>(Accepted|Picked|In Transit|Ready for Delivery|Delivered)[^<]*<\/(?:h3|div|span)>([^<]*)<(?:p|div|span)[^>]*>([^<]*)<\/(?:p|div|span)>/gi;
    const timelineMatches = [...html.matchAll(timelinePattern)];
    
    if (timelineMatches.length > 0) {
      result.timeline = timelineMatches.map((match) => ({
        event: match[1]?.trim() || '',
        detail: match[2]?.trim() || '',
        timestamp: match[3]?.trim() || ''
      })).filter(event => event.event && event.timestamp);
    } else {
      // Fallback timeline extraction
      const fallbackPattern = /(Accepted|Picked|In Transit|Ready for Delivery|Delivered)([^<]*?)(Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Jan|Feb|Mar)\s+\d+,\s+\d{4}\s+\d+:\d+\s+[AP]M/gi;
      const fallbackMatches = [...html.matchAll(fallbackPattern)];
      
      result.timeline = fallbackMatches.map((match) => ({
        event: match[1]?.trim() || '',
        detail: match[2]?.replace(/[^\w\s]/g, '').trim() || '',
        timestamp: match[3]?.trim() || ''
      })).filter(event => event.event && event.timestamp);
    }

  } catch (parseError) {
    console.error('HTML parsing error:', parseError);
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consignment_id, phone } = body;

    if (!consignment_id || !phone) {
      return NextResponse.json(
        { error: 'Consignment ID and phone number are required' },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = `${consignment_id}:${phone}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      cached.data._cached = true;
      return NextResponse.json(cached.data);
    }

    // Get tracking data from real Pathao scraping
    const trackingData = await scrapePathaoReal(consignment_id, phone);

    // Cache the result
    cache.set(cacheKey, {
      data: { ...trackingData, _cached: false },
      timestamp: Date.now(),
    });

    // Always return the data (real or simulated)
    return NextResponse.json(trackingData);

  } catch (error) {
    console.error('API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Pathao Tracking API - Real Scraping Version',
    version: '3.0.0',
    endpoints: {
      'POST /api/track': 'Track a consignment (requires consignment_id and phone)',
    },
    features: [
      'Real Pathao scraping',
      'Anti-bot protection bypass',
      'Vercel compatible',
      'Built-in caching',
      'Error handling'
    ],
    setup: [
      '1. Sign up for ScrapingBee at https://www.scrapingbee.com/',
      '2. Get your API key',
      '3. Set SCRAPINGBEE_API_KEY environment variable in Vercel',
      '4. Deploy and enjoy real tracking!'
    ]
  });
}
