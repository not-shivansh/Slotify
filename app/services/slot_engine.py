"""
Slot Generation Engine
Generates available time slots for a given event type and date,
accounting for availability, date overrides, buffer times, and existing bookings.
"""
from datetime import date, time, datetime, timedelta
from typing import List, Tuple

from sqlalchemy.orm import Session

from app.models import (
    EventType,
    AvailabilitySchedule,
    AvailabilitySlot,
    DateOverride,
    Booking,
)


def _time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def _minutes_to_time(m: int) -> time:
    return time(hour=m // 60, minute=m % 60)


def get_available_slots(
    db: Session,
    event_type: EventType,
    target_date: date,
) -> List[Tuple[time, time]]:
    """
    Returns a list of (start_time, end_time) tuples representing bookable slots.
    """
    duration = event_type.duration_minutes
    buffer_before = event_type.buffer_before
    buffer_after = event_type.buffer_after
    user_id = event_type.user_id

    # -----------------------------------------------------------------------
    # 1. Determine raw availability windows for the target date
    # -----------------------------------------------------------------------
    windows: List[Tuple[int, int]] = []  # list of (start_min, end_min)

    # Check date override first
    override = (
        db.query(DateOverride)
        .filter(DateOverride.user_id == user_id, DateOverride.date == target_date)
        .first()
    )

    if override:
        if override.is_unavailable:
            return []  # entire day blocked
        if override.start_time and override.end_time:
            windows.append((_time_to_minutes(override.start_time), _time_to_minutes(override.end_time)))
    else:
        # Use default availability schedule
        day_of_week = target_date.weekday()  # 0=Monday
        default_schedule = (
            db.query(AvailabilitySchedule)
            .filter(
                AvailabilitySchedule.user_id == user_id,
                AvailabilitySchedule.is_default == True,
            )
            .first()
        )
        if not default_schedule:
            return []

        slots = (
            db.query(AvailabilitySlot)
            .filter(
                AvailabilitySlot.schedule_id == default_schedule.id,
                AvailabilitySlot.day_of_week == day_of_week,
            )
            .order_by(AvailabilitySlot.start_time)
            .all()
        )
        for slot in slots:
            windows.append((_time_to_minutes(slot.start_time), _time_to_minutes(slot.end_time)))

    if not windows:
        return []

    # -----------------------------------------------------------------------
    # 2. Generate candidate slots within each window
    # -----------------------------------------------------------------------
    candidates: List[Tuple[int, int]] = []
    for win_start, win_end in windows:
        cursor = win_start
        while cursor + duration <= win_end:
            candidates.append((cursor, cursor + duration))
            cursor += duration  # non-overlapping consecutive slots

    if not candidates:
        return []

    # -----------------------------------------------------------------------
    # 3. Load existing confirmed bookings for the date and build blocked ranges
    # -----------------------------------------------------------------------
    bookings = (
        db.query(Booking)
        .join(EventType, Booking.event_type_id == EventType.id)
        .filter(
            EventType.user_id == user_id,
            Booking.date == target_date,
            Booking.status == "confirmed",
        )
        .all()
    )

    blocked: List[Tuple[int, int]] = []
    for b in bookings:
        # Find the event type for this booking to get its buffer times
        b_event = db.query(EventType).filter(EventType.id == b.event_type_id).first()
        b_buffer_before = b_event.buffer_before if b_event else 0
        b_buffer_after = b_event.buffer_after if b_event else 0

        block_start = _time_to_minutes(b.start_time) - b_buffer_before
        block_end = _time_to_minutes(b.end_time) + b_buffer_after
        blocked.append((block_start, block_end))

    # -----------------------------------------------------------------------
    # 4. Filter candidates against blocked ranges
    # -----------------------------------------------------------------------
    def is_available(slot_start: int, slot_end: int) -> bool:
        # The full occupied range including buffers for this candidate
        occupied_start = slot_start - buffer_before
        occupied_end = slot_end + buffer_after

        for b_start, b_end in blocked:
            # Overlap check
            if occupied_start < b_end and occupied_end > b_start:
                return False
        return True

    result = []
    for s, e in candidates:
        if is_available(s, e):
            result.append((_minutes_to_time(s), _minutes_to_time(e)))

    return result
