# Marshall Projection Studio — LUMEN-MAP AI v3.5

Web-based architectural projection mapping studio with a **React + TypeScript + Vite** frontend and a **Python FastAPI + OpenCV** computer-vision backend.

## Local Development

### 1. Quick Launch (Windows)
Run `LAUNCH_STUDIO.bat` to start both the Python FastAPI backend (`127.0.0.1:8000`) and the Vite frontend (`localhost:5173`) in a standalone Chrome/Edge app window.

### 2. Manual Launch
**Backend (Python):**
```bash
pip install -r backend/requirements.txt
python -m uvicorn --app-dir backend main:app --host 127.0.0.1 --port 8000
```

**Frontend (Node.js):**
```bash
npm install
npm run dev
```

## Virtual Screen & HDMI Output
- **Physical HDMI Projectors:** Connect your projector(s) in Windows **Extend** mode, open the studio in Chrome/Edge, and click **Take Over Screens 2–4** (granting Window Management permission).
- **Virtual Screen Mode (Single Monitor):** Enable **Virtual Screen** in **Home → Global Settings** or **Screen 8 (Projectors)** to simulate `1920x1080`, `1280x720`, `3840x2160`, or `1080x1920` output in-app or in a detached window.

## Cloud / GitHub Pages Hosting
- **Frontend:** Included `.github/workflows/deploy-pages.yml` builds `dist/` and deploys to GitHub Pages. Set repository variable `VITE_API_URL` to your hosted backend URL.
- **Python Backend:** Deploy `backend/Dockerfile` to Render (`render.yaml` included), Railway, or Fly.io.
- **Standalone / Demo Mode:** If no Python backend is running, the frontend automatically falls back to client-side math & local state.
