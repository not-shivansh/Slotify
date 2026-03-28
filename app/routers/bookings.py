from uuid import UUID
from typing import List
from datetime import date as date_type, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Booking, EventType, Answer, User
from app.schemas import (
    BookingCreate,
    BookingResponse,
    RescheduleRequest,
    TimeSlotResponse,
    AnswerBase,
)
from app.services.slot_engine import get_available_slots
from app.services.email import (
    send_booking_confirmation,
    send_cancellation_notice,
    send_reschedule_notice,
)

router = APIRouter()


def _get_default_user(db: Session) -> User:
    user = db.query(User).first()
    if not user:
        user = User(name="Default User", email="user@slotify.local")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# Slot Generation
# ---------------------------------------------------------------------------
@router.get("/slots", response_model=List[TimeSlotResponse])
def list_slots(
    event_type_id: UUID = Query(...),
    date: date_type = Query(...),
    db: Session = Depends(get_db),
):
    event = db.query(EventType).filter(EventType.id == event_type_id).first()
    if not event:
        raise HTTPException(404, "Event type not found")

    slots = get_available_slots(db, event, date)
    return [TimeSlotResponse(start_time=s, end_time=e) for s, e in slots]


# ---------------------------------------------------------------------------
# Booking
# ---------------------------------------------------------------------------
@router.post("/book", response_model=BookingResponse, status_code=201)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)):
    event = db.query(EventType).filter(EventType.id == payload.event_type_id).first()
    if not event:
        raise HTTPException(404, "Event type not found")

    # Calculate end time
    from datetime import datetime as dt
    start_dt = dt.combine(payload.date, payload.start_time)
    end_dt = start_dt + timedelta(minutes=event.duration_minutes)
    end_time = end_dt.time()

    # Validate slot is available
    available = get_available_slots(db, event, payload.date)
    slot_match = any(s == payload.start_time and e == end_time for s, e in available)
    if not slot_match:
        raise HTTPException(409, "Selected time slot is no longer available")

    booking = Booking(
        event_type_id=event.id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=end_time,
        invitee_name=payload.invitee_name,
        invitee_email=payload.invitee_email,
        status="confirmed",
    )
    db.add(booking)
    db.flush()

    # Save answers
    for ans_data in payload.answers:
        answer = Answer(
            booking_id=booking.id,
            question_id=ans_data.question_id,
            answer_text=ans_data.answer_text,
        )
        db.add(answer)

    db.commit()
    db.refresh(booking)

    # Send email (non-blocking)
    try:
        send_booking_confirmation(
            invitee_email=booking.invitee_email,
            invitee_name=booking.invitee_name,
            event_name=event.name,
            booking_date=booking.date,
            start_time=booking.start_time,
            end_time=booking.end_time,
        )
    except Exception:
        pass

    return booking


# ---------------------------------------------------------------------------
# Cancel
# ---------------------------------------------------------------------------
@router.post("/cancel/{booking_id}", response_model=BookingResponse)
def cancel_booking(booking_id: UUID, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.status != "confirmed":
        raise HTTPException(400, "Only confirmed bookings can be cancelled")

    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)

    event = db.query(EventType).filter(EventType.id == booking.event_type_id).first()
    try:
        send_cancellation_notice(
            invitee_email=booking.invitee_email,
            invitee_name=booking.invitee_name,
            event_name=event.name if event else "Meeting",
            booking_date=booking.date,
            start_time=booking.start_time,
        )
    except Exception:
        pass

    return booking


# ---------------------------------------------------------------------------
# Reschedule
# ---------------------------------------------------------------------------
@router.post("/reschedule/{booking_id}", response_model=BookingResponse)
def reschedule_booking(
    booking_id: UUID,
    payload: RescheduleRequest,
    db: Session = Depends(get_db),
):
    old_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not old_booking:
        raise HTTPException(404, "Booking not found")
    if old_booking.status != "confirmed":
        raise HTTPException(400, "Only confirmed bookings can be rescheduled")

    event = db.query(EventType).filter(EventType.id == old_booking.event_type_id).first()
    if not event:
        raise HTTPException(404, "Event type not found")

    # Calculate new end time
    from datetime import datetime as dt
    start_dt = dt.combine(payload.new_date, payload.new_start_time)
    end_dt = start_dt + timedelta(minutes=event.duration_minutes)
    new_end_time = end_dt.time()

    # Validate new slot
    available = get_available_slots(db, event, payload.new_date)
    slot_match = any(s == payload.new_start_time and e == new_end_time for s, e in available)
    if not slot_match:
        raise HTTPException(409, "Selected time slot is not available")

    # Mark old booking as rescheduled
    old_booking.status = "rescheduled"

    # Create new booking
    new_booking = Booking(
        event_type_id=event.id,
        date=payload.new_date,
        start_time=payload.new_start_time,
        end_time=new_end_time,
        invitee_name=old_booking.invitee_name,
        invitee_email=old_booking.invitee_email,
        status="confirmed",
    )
    db.add(new_booking)
    db.flush()

    old_booking.rescheduled_to_id = new_booking.id

    db.commit()
    db.refresh(new_booking)

    try:
        send_reschedule_notice(
            invitee_email=new_booking.invitee_email,
            invitee_name=new_booking.invitee_name,
            event_name=event.name,
            old_date=old_booking.date,
            old_time=old_booking.start_time,
            new_date=new_booking.date,
            new_start=new_booking.start_time,
            new_end=new_booking.end_time,
        )
    except Exception:
        pass

    return new_booking


# ---------------------------------------------------------------------------
# Meetings Management
# ---------------------------------------------------------------------------
@router.get("/meetings/upcoming", response_model=List[BookingResponse])
def upcoming_meetings(db: Session = Depends(get_db)):
    user = _get_default_user(db)
    today = datetime.utcnow().date()
    return (
        db.query(Booking)
        .join(EventType, Booking.event_type_id == EventType.id)
        .filter(
            EventType.user_id == user.id,
            Booking.date >= today,
            Booking.status == "confirmed",
        )
        .order_by(Booking.date, Booking.start_time)
        .all()
    )


@router.get("/meetings/past", response_model=List[BookingResponse])
def past_meetings(db: Session = Depends(get_db)):
    user = _get_default_user(db)
    today = datetime.utcnow().date()
    return (
        db.query(Booking)
        .join(EventType, Booking.event_type_id == EventType.id)
        .filter(
            EventType.user_id == user.id,
            Booking.date < today,
        )
        .order_by(Booking.date.desc(), Booking.start_time.desc())
        .all()
    )
