from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
import os
import sys

from app.api.websockets import online
from app.api.routes import extract, export, system

app = FastAPI(title="BFO AI Extension API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(online.router, prefix="/api", tags=["websockets"])
app.include_router(extract.router, prefix="/api", tags=["extract"])
app.include_router(export.router, prefix="/api", tags=["export"])
app.include_router(system.router, prefix="/api", tags=["system"])

# Tim dist folder
base_dir = os.path.dirname(os.path.abspath(__file__))
cwd = os.getcwd()

possible = [
    os.path.join(cwd, "extension", "dist"),
    os.path.join(base_dir, "..", "extension", "dist"),
]

dist_path = None
for p in possible:
    p_abs = os.path.abspath(p)
    if os.path.isfile(os.path.join(p_abs, "index.html")):
        dist_path = p_abs
        print(f"[BFO] dist: {dist_path}", file=sys.stderr, flush=True)
        break

if not dist_path:
    print(f"[BFO] NO dist found! cwd={cwd}", file=sys.stderr, flush=True)

# Mount static assets
if dist_path:
    assets_path = os.path.join(dist_path, "assets")
    if os.path.isdir(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

def read_index():
    """Doc noi dung index.html tra ve string"""
    if dist_path:
        try:
            with open(os.path.join(dist_path, "index.html"), encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            print(f"[BFO] Error reading index.html: {e}", file=sys.stderr, flush=True)
    return None

@app.get("/health")
async def health():
    return {"status": "ok", "dist_found": dist_path is not None}

@app.get("/")
async def serve_root():
    content = read_index()
    if content:
        return HTMLResponse(content=content)
    return JSONResponse({"status": "BFO API OK", "dist_found": False})

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if dist_path:
        file_p = os.path.join(dist_path, full_path)
        if os.path.isfile(file_p):
            # Tra ve file nhu text neu la html/js/css
            try:
                with open(file_p, "rb") as f:
                    content = f.read()
                # Xac dinh content type
                if full_path.endswith(".js"):
                    media_type = "application/javascript"
                elif full_path.endswith(".css"):
                    media_type = "text/css"
                elif full_path.endswith(".html"):
                    media_type = "text/html"
                elif full_path.endswith(".svg"):
                    media_type = "image/svg+xml"
                elif full_path.endswith(".json"):
                    media_type = "application/json"
                else:
                    media_type = "application/octet-stream"
                from fastapi import Response
                return Response(content=content, media_type=media_type)
            except Exception as e:
                print(f"[BFO] Error serving {full_path}: {e}", file=sys.stderr, flush=True)
        # Fall back to index.html cho SPA routing
        content = read_index()
        if content:
            return HTMLResponse(content=content)
    return JSONResponse({"status": "BFO API OK", "path": full_path})
