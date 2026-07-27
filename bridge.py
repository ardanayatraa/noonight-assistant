#!/usr/bin/env python3
"""
WhatsApp → Noonight Bridge
Listens on a local port. Hermes WhatsApp messages forwarded here,
then relayed to Noonight API for AI responses.
"""
import json
import sys
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler

NOONIGHT_WEBHOOK = "http://localhost:3001/api/v1/webhook/whatsapp"

class BridgeHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body)
            phone_from = data.get('from', '')
            message = data.get('body', '')
            
            print(f"📱 From {phone_from}: {message[:80]}...")
            
            # Forward to Noonight
            resp = requests.post(
                NOONIGHT_WEBHOOK,
                json={"from": phone_from, "body": message},
                timeout=30
            )
            
            if resp.status_code == 200:
                reply = resp.json()
                print(f"🤖 Reply: {reply.get('body', '')[:80]}...")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(reply).encode())
            else:
                print(f"❌ Noonight error: {resp.status_code}")
                self.send_response(502)
                self.end_headers()
                
        except Exception as e:
            print(f"❌ Error: {e}")
            self.send_response(500)
            self.end_headers()
    
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"status":"ok","service":"whatsapp-bridge"}')

    def log_message(self, format, *args):
        pass  # Suppress default logging

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3456
    server = HTTPServer(('127.0.0.1', port), BridgeHandler)
    print(f"🌉 WhatsApp Bridge running on http://127.0.0.1:{port}")
    print(f"   Forwarding to: {NOONIGHT_WEBHOOK}")
    server.serve_forever()
