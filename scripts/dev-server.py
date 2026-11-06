import mimetypes
import json
import pathlib
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("application/wasm", ".wasm")
root = pathlib.Path(__file__).resolve().parents[1] / "release"
class Handler(SimpleHTTPRequestHandler):
    def send_head(self):
        if "If-Modified-Since" in self.headers:
            del self.headers["If-Modified-Since"]
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        policy = json.loads((root / "manifest.json").read_text(encoding="utf-8"))["content_security_policy"]["extension_pages"]
        self.send_header("Content-Security-Policy", policy)
        super().end_headers()

handler = partial(Handler, directory=str(root))
ThreadingHTTPServer(("127.0.0.1", 8766), handler).serve_forever()
