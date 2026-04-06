from flask import Flask, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return jsonify({
        "status": "ok",
        "message": "Pathao Tracker API is running",
        "version": "minimal"
    })

@app.route('/track', methods=['POST'])
def track():
    return jsonify({
        "consignment_id": "DEMO123",
        "phone": "01234567890",
        "current_status": "Demo Mode - Real tracking coming soon!",
        "recipient_name": "Demo User",
        "address": "Demo Address",
        "seller": "demo.com",
        "product_description": "Demo Product",
        "amount": "0",
        "timeline": [
            {
                "event": "Demo",
                "detail": "This is a demo response",
                "timestamp": "Apr 6, 2026 10:30 PM"
            }
        ]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
