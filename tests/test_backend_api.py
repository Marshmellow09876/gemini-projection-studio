import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import main as backend_main


def main():
    checks = []

    # 1. Telemetry endpoint handler
    telemetry = backend_main.get_hardware_telemetry()
    ok_telemetry = telemetry.get("status") == "online" and "engine_version" in telemetry
    print(f"{'PASS' if ok_telemetry else 'FAIL'}: get_hardware_telemetry() -> status={telemetry.get('status')}")
    checks.append(ok_telemetry)

    # 2. Edge-blend LUT endpoint handler
    lut_req = backend_main.EdgeBlendLUTRequest(
        overlap_width_px=120,
        gamma=2.2,
        steepness_p=2.0,
        black_level_uplift_ire=4.5,
    )
    lut_res = backend_main.generate_edge_blend_lut(lut_req)
    ok_lut = isinstance(lut_res, dict) and len(lut_res) > 0
    print(f"{'PASS' if ok_lut else 'FAIL'}: generate_edge_blend_lut() -> keys={list(lut_res.keys())}")
    checks.append(ok_lut)

    # 3. Audience poll endpoint handler
    poll_res = backend_main.get_audience_poll()
    ok_poll = isinstance(poll_res, dict) and len(poll_res) > 0
    print(f"{'PASS' if ok_poll else 'FAIL'}: get_audience_poll() -> keys={list(poll_res.keys())}")
    checks.append(ok_poll)

    # 4. Alignment matrix endpoint handler
    align_req = backend_main.DualLayerAlignmentRequest(
        global_reference=backend_main.TransformParamsModel(x=0, y=0, scaleX=100, scaleY=100, rotation=0),
        clip_delta=backend_main.TransformParamsModel(x=10, y=-5, scaleX=100, scaleY=100, rotation=0),
        is_global_synced=False,
    )
    align_res = backend_main.compute_dual_layer_alignment(align_req)
    ok_align = isinstance(align_res, dict) and len(align_res) > 0
    print(f"{'PASS' if ok_align else 'FAIL'}: compute_dual_layer_alignment() -> keys={list(align_res.keys())}")
    checks.append(ok_align)

    passed = sum(1 for c in checks if c)
    total = len(checks)
    print(f"\nBackend FastAPI smoke tests: {passed} / {total} passed.")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
