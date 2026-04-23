"""PDF voucher generator for posted payouts.

Run-time dependency: reportlab. Kept separate from tools.py so the
PDF layout stays readable and the tool surface stays thin.
"""
from __future__ import annotations

import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def render_voucher_pdf(draft: dict, txn_ref: str, posted_at: str, approver: str | None) -> bytes:
    """Render a one-page payment voucher PDF and return its bytes.

    Layout intentionally spare: title, vendor block, amount, GL code,
    memo, approver, txn ref, timestamp. No logo, no ornament.
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4

    # Title + rule
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#6b6a66"))
    c.drawString(40, h - 42, "PAYMENT VOUCHER")
    c.setFillColor(colors.HexColor("#111111"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(40, h - 72, draft["vendor"]["name"])
    c.setStrokeColor(colors.HexColor("#bfb7a3"))
    c.setLineWidth(0.5)
    c.line(40, h - 82, w - 40, h - 82)

    # Amount, prominent
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#6b6a66"))
    c.drawString(40, h - 118, "AMOUNT")
    c.setFillColor(colors.HexColor("#111111"))
    c.setFont("Helvetica-Bold", 32)
    c.drawString(40, h - 150, f"₹ {int(draft['amount_inr']):,}")

    # Two-column metadata
    def pair(x: float, y: float, label: str, value: str) -> None:
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#6b6a66"))
        c.drawString(x, y, label.upper())
        c.setFont("Helvetica", 11)
        c.setFillColor(colors.HexColor("#111111"))
        c.drawString(x, y - 16, value)

    col_a = 40
    col_b = w / 2 + 10
    top = h - 210

    pair(col_a, top, "Vendor ID", draft["vendor"]["id"])
    pair(col_b, top, "Draft ID", draft["draft_id"])

    pair(col_a, top - 48, "GL Code", draft["gl_code"])
    pair(col_b, top - 48, "Transaction Ref", txn_ref)

    pair(col_a, top - 96, "Drafted At", draft.get("drafted_at", "—"))
    pair(col_b, top - 96, "Posted At", posted_at)

    pair(col_a, top - 144, "Approver", approver or "auto (below threshold)")
    pair(col_b, top - 144, "Approver Team", draft.get("approver_team", "—"))

    # Memo block
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#6b6a66"))
    c.drawString(40, top - 196, "MEMO")
    c.setFont("Helvetica", 11)
    c.setFillColor(colors.HexColor("#111111"))
    # wrap at ~95 chars per line — crude but adequate
    memo = draft.get("memo", "")
    y = top - 214
    line: list[str] = []
    for word in memo.split():
        if sum(len(w) for w in line) + len(line) + len(word) > 95:
            c.drawString(40, y, " ".join(line))
            y -= 14
            line = []
        line.append(word)
    if line:
        c.drawString(40, y, " ".join(line))

    # Footer
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(colors.HexColor("#6b6a66"))
    c.drawString(40, 40, "System-generated. Not valid without the underlying approval record.")

    c.showPage()
    c.save()
    return buf.getvalue()
