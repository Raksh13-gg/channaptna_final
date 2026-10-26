#!/usr/bin/env python3
"""
Simple HTTP server to serve the Channapatna Toys HTML frontend.
Run this from the project root:
    python serve_frontend.py

Then open: http://127.0.0.1:5500
"""

import os
import sys
import subprocess
import threading
import webbrowser
import time
import http.server
import socketserver

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
PORT = 5500


class SilentHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def log_message(self, fmt, *args):
        # Only log errors
        if int(args[1]) >= 400 if len(args) > 1 else False:
            super().log_message(fmt, *args)


def open_browser():
    time.sleep(1.0)
    webbrowser.open(f"http://127.0.0.1:{PORT}")


if __name__ == "__main__":
    print(f"\n{'='*55}")
    print("  Channapatna Toys — HTML Frontend Dev Server")
    print(f"{'='*55}")
    print(f"  Serving from : {FRONTEND_DIR}")
    print(f"  URL          : http://127.0.0.1:{PORT}")
    print(f"  NOTE: Make sure FastAPI backend is running at")
    print(f"        http://127.0.0.1:8000  (for price APIs)")
    print(f"{'='*55}\n")
    print("  Starting server... Press Ctrl+C to stop.\n")

    threading.Thread(target=open_browser, daemon=True).start()

    with socketserver.TCPServer(("", PORT), SilentHandler) as httpd:
        httpd.allow_reuse_address = True
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server stopped.")
