"""Tools the field service coach can call inside a live video session.

Small, read-only, deterministic. The coach uses these to ground its
narration against the customer's service plan, spares catalogue, and
the repair knowledge base.
"""
from __future__ import annotations


_APPLIANCES: dict[str, dict] = {
    "AC-SPLIT-18K": {
        "model": "AC-SPLIT-18K",
        "type": "Split AC, 1.5 ton, inverter",
        "common_faults": [
            "Iced evaporator from low refrigerant charge.",
            "Blocked drain line producing indoor water leak.",
            "PCB capacitor failure after voltage spikes.",
        ],
    },
    "REFRIG-TW-310": {
        "model": "REFRIG-TW-310",
        "type": "Two-door refrigerator, 310L, frost-free",
        "common_faults": [
            "Door gasket warp causing condensation on the front panel.",
            "Fan motor bearings dry — hum increases at idle.",
            "Defrost timer stuck — ice build-up on the back wall.",
        ],
    },
    "WM-FL-7KG": {
        "model": "WM-FL-7KG",
        "type": "Front-load washing machine, 7kg",
        "common_faults": [
            "Door interlock switch failure — stops mid-cycle with E04.",
            "Drain pump impeller fouled with coins / pins.",
            "Drum bearing wear — loud knock on spin.",
        ],
    },
}


_SPARES: dict[str, list[dict]] = {
    "AC-SPLIT-18K": [
        {"sku": "PCB-18K-GEN3", "label": "Indoor PCB, Gen-3", "in_stock": True, "eta_days": 0},
        {"sku": "GAS-R32-800G", "label": "R32 refrigerant, 800g can", "in_stock": True, "eta_days": 0},
        {"sku": "DRAIN-PVC-2M", "label": "Drain line, 2m PVC", "in_stock": True, "eta_days": 1},
    ],
    "REFRIG-TW-310": [
        {"sku": "GSKT-310-DR1", "label": "Upper-door gasket", "in_stock": False, "eta_days": 3},
        {"sku": "FAN-EVAP-R1", "label": "Evaporator fan motor", "in_stock": True, "eta_days": 0},
        {"sku": "TIMER-DEF-MCH", "label": "Defrost timer, mechanical", "in_stock": True, "eta_days": 1},
    ],
    "WM-FL-7KG": [
        {"sku": "SW-INT-7FL", "label": "Door interlock switch", "in_stock": True, "eta_days": 0},
        {"sku": "PUMP-DRN-FL", "label": "Drain pump assembly", "in_stock": True, "eta_days": 0},
        {"sku": "BRNG-DRM-FL2", "label": "Drum bearing kit (front/back)", "in_stock": False, "eta_days": 5},
    ],
}


def lookup_appliance(model: str) -> dict:
    """Return the appliance type and common fault list for a service model.

    Args:
        model: The model code printed on the rating plate, e.g.
            "AC-SPLIT-18K".
    """
    a = _APPLIANCES.get(model.upper())
    if a is None:
        return {"error": "model_not_found", "model": model}
    return dict(a)


def list_spares(model: str) -> dict:
    """List spare parts available for this appliance with stock + ETA."""
    s = _SPARES.get(model.upper())
    if s is None:
        return {"error": "model_not_found", "model": model}
    return {"model": model.upper(), "items": list(s)}
