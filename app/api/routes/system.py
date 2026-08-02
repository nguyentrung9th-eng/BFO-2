from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/desktop-path")
async def get_desktop_path():
    try:
        desktop = os.path.join(os.path.join(os.environ['USERPROFILE']), 'Desktop') 
        return {"success": True, "desktop_path": desktop}
    except Exception as e:
        return {"success": False, "error": str(e)}
