#!/usr/bin/env python3
"""
Fruits Cut AR — no-build local server (Python).

You do not need this if you are using Vite: `npm run dev` is better, with
hot reload. This exists so the project also runs with nothing installed.

Run:  python serve.py          Windows  ("python3" there is a Store stub)
      python3 serve.py         Mac / Linux
      python serve.py --dist   serve the built dist/ folder instead

Two listeners, on purpose:
  HTTP  on localhost — browsers treat localhost as a secure context even
                       without TLS, so the camera works and there is no
                       certificate warning. Use this on your own machine.
  HTTPS on the LAN   — a phone at 192.168.x.x gets no such exemption and
                       genuinely needs TLS. Skipped if certs/ is absent.
"""

import http.server, ssl, socket, os, sys, threading, posixpath, urllib.parse

HTTP_PORT = 8790
HTTPS_PORT = 8791
HERE = os.path.dirname(os.path.abspath(__file__))
USE_DIST = "--dist" in sys.argv


def search_dirs():
    """Vite serves public/ from the site root; mimic that with no build."""
    if USE_DIST:
        d = os.path.join(HERE, "dist")
        if not os.path.isfile(os.path.join(d, "index.html")):
            sys.exit("\ndist/ has no index.html — run `npm run build` first.\n")
        return [d]
    return [HERE, os.path.join(HERE, "public")]


DIRS = search_dirs()


def lan_ips():
    found = []
    # open a throwaway UDP socket toward a public IP and ask the OS which
    # local interface it would use. Nothing is actually sent.
    for probe in ("8.8.8.8", "1.1.1.1"):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect((probe, 80))
            ip = s.getsockname()[0]
            s.close()
            if ip not in found:
                found.append(ip)
        except OSError:
            pass
    return found


class Handler(http.server.SimpleHTTPRequestHandler):
    # Python's default table does not know these, and a .wasm served as
    # text/plain refuses to instantiate — hand tracking would die silently.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".wasm": "application/wasm",
        ".data": "application/octet-stream",
        ".tflite": "application/octet-stream",
        ".binarypb": "application/octet-stream",
        ".js": "text/javascript",
        ".html": "text/html",
    }

    def translate_path(self, path):
        path = urllib.parse.urlparse(path).path
        path = posixpath.normpath(urllib.parse.unquote(path))
        parts = [p for p in path.split("/") if p and p not in (os.curdir, os.pardir)]
        rel = os.path.join(*parts) if parts else ""
        for root in DIRS:
            candidate = os.path.join(root, rel)
            if os.path.isfile(candidate):
                return candidate
        return os.path.join(DIRS[0], rel)   # let the 404 happen naturally

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s\n" % (fmt % args))


def main():
    try:
        plain = http.server.ThreadingHTTPServer(("0.0.0.0", HTTP_PORT), Handler)
    except OSError as e:
        sys.exit(f"Could not bind port {HTTP_PORT} ({e}). Edit the ports at the top.")

    cert = os.path.join(HERE, "certs", "cert.pem")
    key = os.path.join(HERE, "certs", "key.pem")
    secure = None
    if os.path.exists(cert) and os.path.exists(key):
        try:
            secure = http.server.ThreadingHTTPServer(("0.0.0.0", HTTPS_PORT), Handler)
            ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            ctx.load_cert_chain(cert, key)
            secure.socket = ctx.wrap_socket(secure.socket, server_side=True)
        except OSError as e:
            print(f"  (https listener off: {e})")
            secure = None

    bar = "=" * 60
    print(f"\n{bar}\n  FRUITS CUT AR{'  (serving dist/)' if USE_DIST else ''}\n{bar}")
    print(f"\n  ON THIS COMPUTER  ->  http://localhost:{HTTP_PORT}/")
    print("     No certificate warning. Browsers trust localhost, so the")
    print("     camera works over plain http here.")

    if secure:
        ips = lan_ips()
        if ips:
            print("\n  ON YOUR PHONE (same WiFi):")
            for ip in ips:
                print(f"     https://{ip}:{HTTPS_PORT}/")
            print("     A phone needs real https. The certificate is self-signed,")
            print("     so you get one warning: Advanced, then Proceed.")
        threading.Thread(target=secure.serve_forever, daemon=True).start()
    else:
        print("\n  certs/ not found, so the https listener is off.")
        print("  That only matters for testing on a phone.")

    print("\n  Ctrl+C to stop.\n")
    try:
        plain.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.\n")
        plain.server_close()


if __name__ == "__main__":
    main()
