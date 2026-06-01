from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


def normalize_timestamp(ts: datetime) -> dict:
    """Normalize a datetime into canonical fields.

    Args:
        ts: The datetime to normalize.

    Returns:
        Dict with utc_timestamp, iso_string, date, week_number, month, year.
    """
    if ts.tzinfo is None:
        # Assume UTC if no timezone
        ts = ts.replace(tzinfo=timezone.utc)

    utc_ts = ts.astimezone(timezone.utc)

    return {
        "timestamp_utc": utc_ts,
        "timestamp_iso": utc_ts.isoformat(),
        "date": utc_ts.date().isoformat(),
        "week_number": utc_ts.isocalendar()[1],
        "year": utc_ts.year,
        "month": utc_ts.month,
        "day": utc_ts.day,
        "weekday": utc_ts.weekday(),
        "year_week": f"{utc_ts.year}-W{utc_ts.isocalendar()[1]:02d}",
        "year_month": f"{utc_ts.year}-{utc_ts.month:02d}",
    }


def parse_flexible_date(date_str: str) -> Optional[datetime]:
    """Parse a date string in multiple common formats.

    Args:
        date_str: Date string to parse.

    Returns:
        Parsed datetime or None if unrecognized.
    """
    if not date_str:
        return None

    formats = [
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S+00:00",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y",
        "%Y/%m/%d",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue

    # Try ISO format with variable timezone
    try:
        from dateutil.parser import parse
        return parse(date_str)
    except ImportError:
        pass
    except Exception:
        pass

    return None


def get_academic_period(dt: datetime) -> str:
    """Map a date to an academic period label.

    Args:
        dt: The date.

    Returns:
        Label like '2026-I', '2026-II', etc.
    """
    if dt.month <= 6:
        return f"{dt.year}-I"
    else:
        return f"{dt.year}-II"
