"""Tools the live card scanner calls on a captured frame.

Two narrow helpers:

  identify_bank_by_bin(bin_prefix)   Look up the issuing bank and
                                     network from the first 6 digits
                                     (the BIN / IIN).

  sum_card_digits(digits)            Strip non-digits, sum them,
                                     compute the digital root, and
                                     run a Luhn check so the agent
                                     can call out obvious OCR errors.

Both are deterministic and mocked — this is a demo of live video
understanding, not a card processor.
"""
from __future__ import annotations

import re


# A small, believable table. Matches are by longest prefix, so
# "411111" (test Visa) wins over "4" (Visa generic). Keep entries
# short; extend locally when you want to recognise more issuers.
_BIN_TABLE: dict[str, dict] = {
    # --- Indian issuers (common test + branded BINs) ---
    "414709": {"bank": "HDFC Bank",             "network": "Visa",        "country": "IN"},
    "431940": {"bank": "ICICI Bank",            "network": "Visa",        "country": "IN"},
    "432014": {"bank": "Kotak Mahindra Bank",   "network": "Visa",        "country": "IN"},
    "438857": {"bank": "Axis Bank",             "network": "Visa",        "country": "IN"},
    "542439": {"bank": "HDFC Bank",             "network": "Mastercard",  "country": "IN"},
    "522220": {"bank": "Standard Chartered IN", "network": "Mastercard",  "country": "IN"},
    "607469": {"bank": "State Bank of India",   "network": "RuPay",       "country": "IN"},
    "652150": {"bank": "Bank of Baroda",        "network": "RuPay",       "country": "IN"},

    # --- common test BINs (developer sandboxes) ---
    "411111": {"bank": "Visa test card",        "network": "Visa",        "country": "—"},
    "555555": {"bank": "Mastercard test card",  "network": "Mastercard",  "country": "—"},
    "378282": {"bank": "American Express test", "network": "Amex",        "country": "—"},

    # --- network-level fallbacks (first digit / two digits) ---
    "34":     {"bank": "unknown Amex issuer",       "network": "Amex",       "country": "—"},
    "37":     {"bank": "unknown Amex issuer",       "network": "Amex",       "country": "—"},
    "4":      {"bank": "unknown Visa issuer",       "network": "Visa",       "country": "—"},
    "51":     {"bank": "unknown Mastercard issuer", "network": "Mastercard", "country": "—"},
    "52":     {"bank": "unknown Mastercard issuer", "network": "Mastercard", "country": "—"},
    "53":     {"bank": "unknown Mastercard issuer", "network": "Mastercard", "country": "—"},
    "54":     {"bank": "unknown Mastercard issuer", "network": "Mastercard", "country": "—"},
    "55":     {"bank": "unknown Mastercard issuer", "network": "Mastercard", "country": "—"},
    "60":     {"bank": "unknown RuPay issuer",      "network": "RuPay",      "country": "IN"},
    "65":     {"bank": "unknown RuPay issuer",      "network": "RuPay",      "country": "IN"},
    "81":     {"bank": "unknown RuPay issuer",      "network": "RuPay",      "country": "IN"},
    "82":     {"bank": "unknown RuPay issuer",      "network": "RuPay",      "country": "IN"},
    "62":     {"bank": "unknown UnionPay issuer",   "network": "UnionPay",   "country": "CN"},
    "35":     {"bank": "unknown JCB issuer",        "network": "JCB",        "country": "JP"},
}


def identify_bank_by_bin(bin_prefix: str) -> dict:
    """Look up the issuing bank and card network from a BIN / IIN.

    The BIN is the first six digits of the card number (four or two
    for older / shorter prefixes). The function matches the LONGEST
    known prefix so the more specific issuer wins over the generic
    network fallback.

    Args:
        bin_prefix: A string containing at least the first two digits
            of the card number. Non-digit characters are ignored.

    Returns:
        {
          "bin": str,                 # the digits used for the match
          "matched_prefix": str,      # which prefix in the table hit
          "bank": str,
          "network": str,             # "Visa" | "Mastercard" | "Amex" | "RuPay" | "JCB" | "UnionPay" | "unknown"
          "country": str,
        }
    """
    digits = re.sub(r"\D", "", bin_prefix or "")
    if not digits:
        return {"error": "no_digits", "bin": bin_prefix}

    best = ""
    for prefix in _BIN_TABLE:
        if digits.startswith(prefix) and len(prefix) > len(best):
            best = prefix
    if not best:
        return {
            "bin": digits[:6],
            "matched_prefix": "",
            "bank": "unknown issuer",
            "network": "unknown",
            "country": "—",
        }
    entry = _BIN_TABLE[best]
    return {
        "bin": digits[:6],
        "matched_prefix": best,
        "bank": entry["bank"],
        "network": entry["network"],
        "country": entry["country"],
    }


def sum_card_digits(digits: str) -> dict:
    """Sum the digits of a card number, compute the digital root, and
    run a Luhn check so the agent can flag an OCR miss.

    Args:
        digits: The card number as a string. Spaces, dashes, and any
            other non-digit characters are stripped.

    Returns:
        {
          "input": str,              # the cleaned digit string
          "length": int,
          "sum": int,                # simple arithmetic sum of each digit
          "digital_root": int,       # repeatedly summed until 1–9
          "luhn_valid": bool,        # whether Luhn's checksum passes
        }
    """
    cleaned = re.sub(r"\D", "", digits or "")
    if not cleaned:
        return {"error": "no_digits", "input": digits}
    total = sum(int(c) for c in cleaned)
    # Digital root: keep summing digits until one digit remains.
    n = total
    while n >= 10:
        n = sum(int(c) for c in str(n))
    return {
        "input": cleaned,
        "length": len(cleaned),
        "sum": total,
        "digital_root": n,
        "luhn_valid": _luhn_ok(cleaned),
    }


def _luhn_ok(digits: str) -> bool:
    """Classic Luhn mod-10 check."""
    if len(digits) < 12:
        return False
    total = 0
    # Process from rightmost digit, doubling every second one.
    for i, c in enumerate(reversed(digits)):
        d = int(c)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0
