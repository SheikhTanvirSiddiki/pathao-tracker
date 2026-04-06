"""
Pathao Parcel Tracking Gateway Server
======================================
Scrapes Pathao's merchant tracking page using Playwright (headless Chromium)
and exposes a clean REST API consumed by the frontend.

Install dependencies:
    pip install flask flask-cors playwright
    playwright install chromium

Run:
    python server.py
"""

import asyncio
import json
import re
import time
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from playwright.async_api import async_playwright

app = Flask(__name__)
CORS(app)

PATHAO_TRACKING_URL = "https://merchant.pathao.com/tracking"

# Simple in-memory cache (consignment_id -> {data, timestamp})
_cache: dict = {}
CACHE_TTL = 60  # seconds


async def extract_from_api_data(api_data, consignment_id, phone):
    """Fast extraction when API data is available"""
    result = {}
    
    if "data" in api_data:
        data = api_data["data"]
        
        # Extract all fields directly from API data
        result["consignment_id"] = consignment_id
        result["phone"] = phone
        
        # Order information
        if "order" in data:
            order = data["order"]
            result["recipient_name"] = order.get("recipient_name", "")
            result["address"] = order.get("recipient_address", "")
            result["seller"] = order.get("merchant_name", "")
            result["product_description"] = order.get("order_description", "")
            result["amount"] = str(order.get("collectable_amount", ""))
        
        # Status information
        if "state" in data:
            result["current_status"] = data["state"].get("name", "Unknown")
        
        # Timeline from log
        if "log" in data:
            timeline = []
            for entry in data["log"]:
                timeline.append({
                    "event": entry.get("grouped_status", [])[0] if entry.get("grouped_status") else "Unknown",
                    "detail": entry.get("desc", ""),
                    "timestamp": entry.get("created_at", "")
                })
            result["timeline"] = timeline
        
        result["raw_api"] = api_data
    
    return result


async def scrape_pathao(consignment_id: str, phone: str) -> dict:
    url = f"{PATHAO_TRACKING_URL}?consignment_id={consignment_id}&phone={phone}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        )
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
        )
        page = await context.new_page()

        # Intercept XHR/fetch responses to grab the raw API payload
        api_data = {}

        async def handle_response(response):
            nonlocal api_data
            try:
                if (
                    "tracking" in response.url
                    and response.status == 200
                    and "application/json" in response.headers.get("content-type", "")
                ):
                    body = await response.json()
                    api_data.update(body)
            except Exception:
                pass

        page.on("response", handle_response)

        # Optimize page load - wait for network to be idle but reduce timeout
        await page.goto(url, wait_until="domcontentloaded", timeout=15000)
        
        # Wait a bit for API calls to complete
        await asyncio.sleep(1)
        
        # Check if we got API data early - if so, skip full DOM parsing
        if api_data and "data" in api_data:
            # We have the data we need, close browser early
            await browser.close()
            return await extract_from_api_data(api_data, consignment_id, phone)

        # --- Parse via DOM if API data wasn't captured ---
        result = {}

        # Try to extract from intercepted API data first
        if api_data:
            result["raw_api"] = api_data

        # Always also parse the rendered DOM as fallback / supplement
        html = await page.content()

        # Recipient info - prioritize API data over DOM parsing
        recipient_name = ""
        
        # First try to get recipient from API data
        if api_data and "data" in api_data and "order" in api_data["data"]:
            api_recipient = api_data["data"]["order"].get("recipient_name", "")
            if api_recipient:
                recipient_name = api_recipient
        
        # Fallback to DOM parsing if API data doesn't have recipient
        if not recipient_name:
            try:
                name_el = await page.query_selector("[class*='recipientName'], [class*='recipient-name'], h2, h3")
                if name_el:
                    recipient_name = (await name_el.inner_text()).strip()
            except Exception:
                pass
        
        if recipient_name:
            result["recipient_name"] = recipient_name

        # Consignment id display
        try:
            cid_el = await page.query_selector("[class*='consignment']")
            if cid_el:
                result["consignment_id_display"] = (await cid_el.inner_text()).strip()
        except Exception:
            pass

        # Try grabbing all text content for parsing
        try:
            body_text = await page.inner_text("body")
        except Exception:
            body_text = ""

        result["consignment_id"] = consignment_id
        result["phone"] = phone

        # Extract status steps from DOM elements
        status_steps = []
        try:
            # Pathao uses timeline/step components
            step_selectors = [
                "[class*='step']",
                "[class*='timeline']",
                "[class*='tracking-step']",
                "[class*='status']",
            ]
            for sel in step_selectors:
                els = await page.query_selector_all(sel)
                if els:
                    for el in els:
                        text = (await el.inner_text()).strip()
                        if text and len(text) > 2:
                            status_steps.append(text)
                    if status_steps:
                        break
        except Exception:
            pass

        result["status_steps_raw"] = status_steps

        # Extract product description - prioritize API data over regex parsing
        product_description = ""
        
        # First try to get product from API data
        if api_data and "data" in api_data and "order" in api_data["data"]:
            api_product = api_data["data"]["order"].get("order_description", "")
            if api_product:
                product_description = api_product
        
        # Fallback to regex parsing if API data doesn't have product
        if not product_description:
            try:
                prod_match = re.search(
                    r"(TEAM|DDR4|DDR5|SSD|RAM|CPU|GPU|[A-Z]{2,}.*?(?:GB|MHz|TB).*?)(?:\n|--)",
                    body_text,
                    re.IGNORECASE,
                )
                if prod_match:
                    product_description = prod_match.group(1).strip()
            except Exception:
                pass
        
        if product_description:
            result["product_description"] = product_description

        # Extract amount - prioritize API data over regex parsing
        amount = ""
        
        # First try to get amount from API data
        if api_data and "data" in api_data and "order" in api_data["data"]:
            api_amount = api_data["data"]["order"].get("collectable_amount", "")
            if api_amount:
                amount = str(api_amount)
        
        # Fallback to regex parsing if API data doesn't have amount
        if not amount:
            try:
                amount_match = re.search(r"[৳Tk\.]\s*([\d,]+)", body_text)
                if amount_match:
                    amount = amount_match.group(1).replace(",", "")
            except Exception:
                pass
        
        if amount:
            result["amount"] = amount

        # Extract current status keyword - prioritize API data over text parsing
        current_status = "Unknown"
        
        # First try to get status from API data
        if api_data and "data" in api_data and "state" in api_data["data"]:
            api_status = api_data["data"]["state"].get("name", "")
            if api_status:
                current_status = api_status
        else:
            # Fallback to text parsing
            status_keywords = [
                "Delivered", "Ready for Delivery", "In Transit",
                "Picked", "Accepted", "Returned", "Cancelled", "On Hold"
            ]
            for kw in status_keywords:
                if kw.lower() in body_text.lower():
                    current_status = kw
                    break
        
        result["current_status"] = current_status

        # Extract timeline events with dates
        timeline = []
        event_pattern = re.compile(
            r"(Accepted|Picked|In Transit|Ready for Delivery|Delivered|Order has been|Assigned)"
            r"(.{0,200}?)"
            r"(Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Jan|Feb|Mar)\s+\d+,\s+\d{4}\s+\d+:\d+\s+[AP]M",
            re.IGNORECASE | re.DOTALL,
        )
        for match in event_pattern.finditer(body_text):
            timeline.append({
                "event": match.group(1).strip(),
                "detail": re.sub(r"\s+", " ", match.group(2)).strip(),
                "timestamp": match.group(0).split("\n")[-1].strip()
                if "\n" in match.group(0)
                else match.group(0)[-30:].strip(),
            })

        if timeline:
            result["timeline"] = timeline

        # Extract address - prioritize API data over text parsing
        address = ""
        
        # First try to get address from API data
        if api_data and "data" in api_data and "order" in api_data["data"]:
            api_address = api_data["data"]["order"].get("recipient_address", "")
            if api_address:
                address = api_address
        
        # Fallback to text parsing if API data doesn't have address
        if not address:
            addr_match = re.search(r"(PHC|House|Road|Rd|Village|Vill)[^\n]{10,100}", body_text)
            if addr_match:
                address = addr_match.group(0).strip()
        
        if address:
            result["address"] = address

        # Extract seller - prioritize API data over text parsing
        seller = ""
        
        # First try to get seller from API data
        if api_data and "data" in api_data and "order" in api_data["data"]:
            api_seller = api_data["data"]["order"].get("merchant_name", "")
            if api_seller:
                seller = api_seller
        
        # Fallback to text parsing if API data doesn't have seller
        if not seller:
            seller_match = re.search(r"Seller[:\s]+([a-zA-Z0-9\.\-]+\.(?:com|bd|net|org)[^\s]*)", body_text)
            if seller_match:
                seller = seller_match.group(1).strip()
        
        if seller:
            result["seller"] = seller

        # Full body for debug (first 3000 chars)
        result["_page_text_preview"] = body_text[:3000]

        await browser.close()
        return result


def run_scrape(consignment_id: str, phone: str) -> dict:
    return asyncio.run(scrape_pathao(consignment_id, phone))


@app.route("/api/track", methods=["GET"])
def track():
    consignment_id = request.args.get("consignment_id", "").strip().upper()
    phone = request.args.get("phone", "").strip()

    if not consignment_id:
        return jsonify({"error": "Consignment ID is required"}), 400
    if not phone:
        return jsonify({"error": "Phone number is required"}), 400

    cache_key = f"{consignment_id}:{phone}"
    cached = _cache.get(cache_key)
    if cached and (time.time() - cached["ts"]) < CACHE_TTL:
        data = cached["data"]
        data["_cached"] = True
        return jsonify(data)

    try:
        data = run_scrape(consignment_id, phone)
        
        # Check if tracking data was found
        if not data or "current_status" not in data:
            return jsonify({"error": "No tracking data found for this consignment ID and phone number combination"}), 404
            
        if data.get("current_status") == "Unknown":
            return jsonify({"error": "Tracking information not available. Please verify your consignment ID and phone number"}), 404
            
        _cache[cache_key] = {"data": data, "ts": time.time()}
        data["_cached"] = False
        return jsonify(data)
    except Exception as e:
        # Provide more specific error messages
        error_msg = str(e)
        if "timeout" in error_msg.lower():
            return jsonify({"error": "Request timeout. Pathao servers are taking too long to respond. Please try again"}), 500
        elif "not found" in error_msg.lower():
            return jsonify({"error": "No tracking data found. Please check your consignment ID and phone number"}), 404
        else:
            return jsonify({"error": f"Tracking service error: {error_msg}", "consignment_id": consignment_id}), 500


@app.route("/api/test-delivered", methods=["GET"])
def test_delivered():
    """Test endpoint to simulate delivered status"""
    try:
        data = run_scrape("DP060426XYKJPB", "01993969247")
        data["current_status"] = "Delivered"
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/html", methods=["GET"])
def get_html():
    consignment_id = request.args.get("consignment_id", "").strip().upper()
    phone = request.args.get("phone", "").strip()

    if not consignment_id:
        return jsonify({"error": "consignment_id is required"}), 400
    if not phone:
        return jsonify({"error": "phone is required"}), 400

    try:
        # Get the full HTML content
        async def get_full_html():
            url = f"{PATHAO_TRACKING_URL}?consignment_id={consignment_id}&phone={phone}"
            
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent=(
                        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                    ),
                    viewport={"width": 1280, "height": 900},
                )
                page = await context.new_page()
                await page.goto(url, wait_until="networkidle", timeout=30000)
                await asyncio.sleep(3)
                html = await page.content()
                await browser.close()
                return html
        
        html_content = asyncio.run(get_full_html())
        return jsonify({
            "consignment_id": consignment_id,
            "phone": phone,
            "html": html_content
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Pathao Tracking Gateway"})


@app.route("/", methods=["GET"])
def index():
    return send_from_directory('.', 'index.html')


if __name__ == "__main__":
    print("=" * 55)
    print("  Pathao Tracking Gateway  |  http://localhost:5000")
    print("=" * 55)
    app.run(debug=True, port=5000)
