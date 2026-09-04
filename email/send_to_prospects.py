#!/usr/bin/env python3
"""
Send personalized outreach via Mailgun from a prospects CSV.

Expected CSV columns (extra columns ignored):
  company_name, segment, website_domain, suggested_contact_name, work_email
  (+ optional: target_title, why_fit, hq_or_primary_market, notes)

Fill in the CONFIG block below, then:

  # Dry-run (default) — prints every message, sends nothing
  python3 mailgun_send_prospects.py /path/to/prospects.csv
  python3 mailgun_send_prospects.py prospects.csv --dry-run

  # Actually send
  python3 mailgun_send_prospects.py prospects.csv --send
  python3 mailgun_send_prospects.py prospects.csv --send --limit 5
"""

from __future__ import annotations

import argparse
import csv
import datetime
import re
import sys
import time
from collections import Counter
from email.utils import parseaddr
from pathlib import Path
from typing import Any

try:
    import requests
except ImportError:
    print("Missing dependency: requests  (pip install requests)", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Mailgun config — hardcode your values here
# ---------------------------------------------------------------------------
CONFIG = {
    "api_key
    "domain": "LoganBesecker.com",  # sending domain
    "from_header": "Logan Besecker <me@LoganBesecker.com>",
    "base_url": "https://api.mailgun.net/v3",  # EU: https://api.eu.mailgun.net/v3
    "reply_to": "me@LoganBesecker.com",
    "tag": f"brief_{datetime.date.today()}",
    "brief_url": "https://loganbesecker.com/Compliance/brief/thomson-reuters-full",
    "preview_pdf": "preview.pdf",
}
# ---------------------------------------------------------------------------

EMAIL_RE = re.compile(
    r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
)

SUBJECT = "Thomson Reuters C-Track breach — $10k brief (preview attached)"

BRIEF_URL = CONFIG["brief_url"]

BODY_TEMPLATES = {
    "Defense Law": """Hi {first_name},

Thomson Reuters just disclosed a C-Track court CMS breach hitting appellate systems across a dozen+ U.S. jurisdictions plus Ontario — including possible SSNs, medical fields, and sealed/confidential records.

Speed-to-lead matters: notice centers are live, judicial pressure is public, and class actions aren't widely captioned yet. Outside counsel that brief clients first usually owns the workstream.

I put together a one-and-done $10k executive brief (timeline, court-by-court tracker, regulatory/litigation radar, decision-maker map). Preview PDF is attached (redacted). Full unlock:

{brief_url}

If you're coaching boards or racing a retainer this week, grab it while the window is still open.

Best,
{sender_name}
""",
    "Crisis PR": """Hi {first_name},

TR's C-Track breach is a same-day crisis story: sealed court data, multi-jurisdiction notices, and Oregon's chief justice already calling a vendor failure of this kind "unacceptable." Citizen/media inbound is climbing with the notice center live.

Attached is a redacted preview of a one-and-done $10k executive brief — stakeholder map, messaging angles (vendor cloud vs. court networks), timeline, and contacts. Full version:

{brief_url}

Happy to walk your team through it if you're staffing a client right now.

Best,
{sender_name}
""",
    "Cyber IR/MSSP": """Hi {first_name},

Thomson Reuters disclosed a C-Track cloud compromise on court case-management data (March access → June discovery → early-September public notices) across many U.S. jurisdictions and Ontario. Courts want independent validation; panels will ask who can scope it.

Attached: redacted preview of a $10k one-and-done brief with public timeline, jurisdiction tracker, and IR retainer open-questions. Full brief:

{brief_url}

Useful ammo before the next pitch call.

Best,
{sender_name}
""",
    "Plaintiffs": """Hi {first_name},

TR / West C-Track is public on a multi-jurisdiction court-records exposure (possible SSN/DL/medical + sealed data). No widely reported named class caption yet — classic speed-to-file window.

Redacted preview attached. Full $10k one-and-done brief (court tracker, data categories, notice status, liability framing):

{brief_url}

Best,
{sender_name}
""",
    "Cyber Insurance": """Hi {first_name},

Thomson Reuters' C-Track court CMS breach is a clean systemic-risk example: legal-tech concentration + sealed/PII exposure across U.S. jurisdictions and Ontario.

Redacted preview attached. Full $10k one-and-done brief (timeline, blast radius, vendor-vs-court liability split) for insured/carrier conversations:

{brief_url}

Best,
{sender_name}
""",
    "_default": """Hi {first_name},

Thomson Reuters just went public on a C-Track cloud breach affecting court systems across a dozen+ U.S. jurisdictions plus Ontario — possible SSNs, medical fields, and sealed/confidential records.

Redacted preview PDF attached. Unlock the full one-and-done $10k executive brief here:

{brief_url}

Best,
{sender_name}
""",
}


def is_valid_email(value: str) -> bool:
    value = (value or "").strip()
    if not value or "@" not in value:
        return False
    lowered = value.lower()
    if any(x in lowered for x in ("example.com", "noreply", "noemail", "tbd", "n/a")):
        return False
    return bool(EMAIL_RE.match(value))


def first_name(full_name: str, email: str) -> str:
    name = (full_name or "").strip()
    if name:
        return name.split()[0]
    local = email.split("@", 1)[0]
    token = re.split(r"[._+-]", local)[0]
    return token[:1].upper() + token[1:] if token else "there"


def pick_template(segment: str) -> str:
    seg = (segment or "").strip()
    if seg in BODY_TEMPLATES:
        return BODY_TEMPLATES[seg]
    low = seg.lower()
    if "law" in low or "defense" in low:
        return BODY_TEMPLATES["Defense Law"]
    if "crisis" in low or "pr" in low:
        return BODY_TEMPLATES["Crisis PR"]
    if "ir" in low or "mssp" in low or ("cyber" in low and "insurance" not in low):
        return BODY_TEMPLATES["Cyber IR/MSSP"]
    if "plaintiff" in low:
        return BODY_TEMPLATES["Plaintiffs"]
    if "insurance" in low:
        return BODY_TEMPLATES["Cyber Insurance"]
    return BODY_TEMPLATES["_default"]


def load_prospects(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames or "work_email" not in reader.fieldnames:
            raise SystemExit(
                f"CSV must include a work_email column. Found: {reader.fieldnames}"
            )
        rows = []
        for i, row in enumerate(reader, start=2):
            email = (row.get("work_email") or "").strip()
            if not is_valid_email(email):
                continue
            rows.append(
                {
                    "line": str(i),
                    "company_name": (row.get("company_name") or "").strip(),
                    "segment": (row.get("segment") or "").strip(),
                    "suggested_contact_name": (
                        row.get("suggested_contact_name") or ""
                    ).strip(),
                    "work_email": email,
                    "target_title": (row.get("target_title") or "").strip(),
                }
            )
        return rows


def sender_display_name(from_header: str) -> str:
    name, addr = parseaddr(from_header)
    if name:
        return name
    if addr and "@" in addr:
        return addr.split("@", 1)[0]
    return "Logan"


def build_message(row: dict[str, str], from_header: str) -> tuple[str, str]:
    tmpl = pick_template(row["segment"])
    body = tmpl.format(
        first_name=first_name(row["suggested_contact_name"], row["work_email"]),
        sender_name=sender_display_name(from_header),
        company=row["company_name"] or "your firm",
        brief_url=(CONFIG.get("brief_url") or BRIEF_URL).strip(),
    )
    return SUBJECT, body


def resolve_preview_pdf() -> Path | None:
    pdf_cfg = (CONFIG.get("preview_pdf") or "preview.pdf").strip()
    attachment_path = Path(pdf_cfg).expanduser()
    if attachment_path.is_file():
        return attachment_path
    candidates = [
        Path.cwd() / "preview.pdf",
        Path(__file__).resolve().parent.parent / "preview.pdf",
        Path("/workspace/preview.pdf"),
        Path("/workspace/acla-briefs-app/briefs/preview.pdf"),
    ]
    return next((p for p in candidates if p.is_file()), None)


def mailgun_send(
    *,
    base_url: str,
    domain: str,
    api_key: str,
    from_header: str,
    to_addr: str,
    subject: str,
    text: str,
    reply_to: str | None,
    tag: str | None,
    attachment_path: Path | None = None,
) -> dict[str, Any]:
    url = f"{base_url.rstrip('/')}/{domain}/messages"
    data: dict[str, Any] = {
        "from": from_header,
        "to": [to_addr],
        "subject": subject,
        "text": text,
    }
    if reply_to:
        data["h:Reply-To"] = reply_to
    if tag:
        data["o:tag"] = tag
    files = None
    if attachment_path is not None:
        files = [
            (
                "attachment",
                (
                    attachment_path.name,
                    attachment_path.read_bytes(),
                    "application/pdf",
                ),
            )
        ]
    resp = requests.post(
        url, auth=("api", api_key), data=data, files=files, timeout=60
    )
    try:
        payload = resp.json()
    except Exception:
        payload = {"raw": resp.text}
    if resp.status_code >= 400:
        raise RuntimeError(f"Mailgun {resp.status_code}: {payload}")
    return payload


def run_dry_run(
    prospects: list[dict[str, str]],
    *,
    from_header: str,
    subject_override: str | None,
    attachment_path: Path | None,
) -> int:
    """Print every outbound message. Never calls Mailgun."""
    print("=" * 60)
    print("DRY RUN — no emails will be sent, no Mailgun API calls")
    print("=" * 60)
    print(f"From:     {from_header or '(missing CONFIG from_header)'}")
    print(f"Reply-To: {(CONFIG.get('reply_to') or '').strip() or '(none)'}")
    print(f"Domain:   {(CONFIG.get('domain') or '').strip() or '(missing)'}")
    print(f"Tag:      {(CONFIG.get('tag') or '').strip() or '(none)'}")
    print(f"URL:      {(CONFIG.get('brief_url') or '').strip()}")
    if attachment_path:
        size_kb = attachment_path.stat().st_size / 1024
        print(f"Attach:   {attachment_path} ({size_kb:.1f} KB)")
    else:
        print("Attach:   MISSING preview.pdf — --send would fail")
    print(f"Recipients: {len(prospects)}")
    by_seg = Counter(r["segment"] or "(blank)" for r in prospects)
    if by_seg:
        print("By segment:")
        for seg, n in sorted(by_seg.items(), key=lambda x: (-x[1], x[0])):
            print(f"  {n:3d}  {seg}")

    for idx, row in enumerate(prospects, start=1):
        subj, body = build_message(row, from_header or "Sender <you@example.com>")
        if subject_override:
            subj = subject_override
        print("-" * 60)
        print(f"[{idx}/{len(prospects)}]")
        print(f"TO:      {row['work_email']}")
        print(f"NAME:    {row['suggested_contact_name'] or '(from email)'}")
        print(f"COMPANY: {row['company_name']}")
        print(f"SEGMENT: {row['segment']}")
        print(f"SUBJECT: {subj}")
        print("BODY:")
        print(body.rstrip())

    print("-" * 60)
    print(f"DRY RUN complete — {len(prospects)} message(s) previewed, 0 sent.")
    print("Re-run with --send when ready to deliver via Mailgun.")
    return 0 if attachment_path else 1


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Mailgun CSV prospect sender (dry-run by default)"
    )
    ap.add_argument("csv", type=Path, help="Prospects CSV path")
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview messages only (default if --send is omitted)",
    )
    mode.add_argument(
        "--send",
        action="store_true",
        help="Actually send via Mailgun",
    )
    ap.add_argument("--limit", type=int, default=0, help="Max recipients (0 = all)")
    ap.add_argument("--skip", type=int, default=0, help="Skip first N valid emails")
    ap.add_argument(
        "--sleep",
        type=float,
        default=0.35,
        help="Seconds between sends (default 0.35)",
    )
    ap.add_argument(
        "--subject",
        default=None,
        help="Override subject line",
    )
    args = ap.parse_args()

    # Default = dry-run unless --send
    do_send = bool(args.send)
    dry_run = (not do_send) or bool(args.dry_run)

    if not args.csv.is_file():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        return 1

    prospects = load_prospects(args.csv)
    if args.skip:
        prospects = prospects[args.skip :]
    if args.limit and args.limit > 0:
        prospects = prospects[: args.limit]

    print(f"Valid recipients: {len(prospects)}")
    if not prospects:
        return 0

    from_header = (CONFIG.get("from_header") or "").strip()
    attachment_path = resolve_preview_pdf()

    if dry_run and not do_send:
        return run_dry_run(
            prospects,
            from_header=from_header,
            subject_override=args.subject,
            attachment_path=attachment_path,
        )

    # --send path
    api_key = (CONFIG.get("api_key") or "").strip()
    domain = (CONFIG.get("domain") or "").strip()
    base_url = (CONFIG.get("base_url") or "https://api.mailgun.net/v3").strip()
    reply_to = (CONFIG.get("reply_to") or "").strip() or None
    tag = (CONFIG.get("tag") or "").strip() or None

    missing = [
        n
        for n, v in [
            ("CONFIG['api_key']", api_key),
            ("CONFIG['domain']", domain),
            ("CONFIG['from_header']", from_header),
        ]
        if not v
    ]
    if missing:
        print(
            f"Fill in CONFIG at top of script before --send: {', '.join(missing)}",
            file=sys.stderr,
        )
        return 1

    if attachment_path is None:
        print(
            f"preview PDF not found: {(CONFIG.get('preview_pdf') or 'preview.pdf')!r} "
            "(set CONFIG['preview_pdf'])",
            file=sys.stderr,
        )
        return 1

    print(f"SEND MODE — delivering via Mailgun")
    print(f"Attaching: {attachment_path}")

    ok = fail = 0
    for row in prospects:
        subj, body = build_message(row, from_header)
        if args.subject:
            subj = args.subject
        try:
            result = mailgun_send(
                base_url=base_url,
                domain=domain,
                api_key=api_key,
                from_header=from_header,
                to_addr=row["work_email"],
                subject=subj,
                text=body,
                reply_to=reply_to,
                tag=tag,
                attachment_path=attachment_path,
            )
            ok += 1
            print(f"SENT {row['work_email']}  id={result.get('id', result)}")
        except Exception as e:
            fail += 1
            print(f"FAIL {row['work_email']}  {e}", file=sys.stderr)
        time.sleep(max(args.sleep, 0))

    print(f"Done. sent={ok} failed={fail}")
    return 0 if fail == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
