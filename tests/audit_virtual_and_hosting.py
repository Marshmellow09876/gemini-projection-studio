import os
import sys


def check_file_contains(filepath, patterns, label):
    if not os.path.exists(filepath):
        print(f"FAIL: {label} - Missing file: {filepath}")
        return False
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    ok = True
    for pat in patterns:
        if pat not in content:
            print(f"FAIL: {label} - Missing pattern: {pat}")
            ok = False
    if ok:
        print(f"PASS: {label}")
    return ok


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    results = [
        check_file_contains(
            os.path.join(root, "src", "store", "useProjectionStore.ts"),
            [
                "virtualScreenEnabled",
                "virtualScreenResolution",
                "virtualScreenTarget",
                "BACKEND_BASE_URL",
            ],
            "Store: Virtual Screen settings & configurable BACKEND_BASE_URL",
        ),
        check_file_contains(
            os.path.join(root, "src", "screens", "Screen1Home.tsx"),
            [
                "Virtual Screen (1920x1080)",
                "Virtual Screen (1280x720)",
                "settings-virtual-screen",
                "settings-virtual-res",
                "settings-virtual-target",
                "EXPORT BACKUP",
                "BROWSER-ONLY MODE",
            ],
            "Screen1Home: Virtual Screen controls, backup export & offline indicator",
        ),
        check_file_contains(
            os.path.join(root, "src", "screens", "Screen8ProjectorSetup.tsx"),
            [
                "screen8-virtual-toggle",
                "Open Virtual Screen Window",
                "Test HDMI &amp; Displays",
                "runHdmiPreflightCheck",
                "Output Test Pattern:",
            ],
            "Screen8ProjectorSetup: Virtual Screen panel, HDMI preflight & test patterns",
        ),
        check_file_contains(
            os.path.join(root, "src", "components", "ProjectorOutputView.tsx"),
            [
                "virtualScreenMeta",
                "showSafeAreaGuides",
                "95% ACTION SAFE",
                "90% TITLE SAFE",
                "lastSyncTime",
                "SAFE GUIDES",
            ],
            "ProjectorOutputView: Virtual Screen scaling, safe guides & sync heartbeat",
        ),
        check_file_contains(
            os.path.join(root, "src", "components", "SystemHeader.tsx"),
            [
                "handleLaunchProjector",
                "virtualScreenTarget",
                "e.key === 'g'",
                "e.key === 'v'",
            ],
            "SystemHeader: Virtual Screen launch routing & G/V hotkeys",
        ),
        check_file_contains(
            os.path.join(root, "src", "utils", "apiClient.ts"),
            ["import.meta.env.VITE_API_URL"],
            "apiClient.ts: VITE_API_URL environment override",
        ),
        check_file_contains(
            os.path.join(root, ".gitignore"),
            ["node_modules/", "dist/", "backend/__pycache__/"],
            ".gitignore: Node, Vite, and Python exclusions",
        ),
        check_file_contains(
            os.path.join(root, "backend", "Dockerfile"),
            ["uvicorn", "main:app", "requirements.txt"],
            "backend/Dockerfile: FastAPI container config",
        ),
        check_file_contains(
            os.path.join(root, "render.yaml"),
            ["marshall-projection-studio-api", "/api/v1/telemetry"],
            "render.yaml: Render deployment blueprint",
        ),
        check_file_contains(
            os.path.join(root, ".github", "workflows", "deploy-pages.yml"),
            ["deploy-pages@v4", "VITE_BASE_PATH", "npm run build"],
            "GitHub Pages workflow: Automated build & deploy",
        ),
    ]

    passed = sum(1 for r in results if r)
    total = len(results)
    print(f"\nVirtual Screen & Hosting audit complete: {passed} / {total} tests passed.")
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
