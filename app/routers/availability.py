from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AvailabilitySchedule, AvailabilitySlot, User
from app.schemas import (
    AvailabilityScheduleCreate,
    AvailabilityScheduleUpdate,
    AvailabilityScheduleResponse,
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


@router.post("/availability", response_model=AvailabilityScheduleResponse, status_code=201)
def create_schedule(payload: AvailabilityScheduleCreate, db: Session = Depends(get_db)):
    user = _get_default_user(db)

    # If this is marked default, un-default others
    if payload.is_default:
        db.query(AvailabilitySchedule).filter(
            AvailabilitySchedule.user_id == user.id,
            AvailabilitySchedule.is_default == True,
        ).update({"is_default": False})

    schedule = AvailabilitySchedule(
        user_id=user.id,
        name=payload.name,
        is_default=payload.is_default,
    )
    db.add(schedule)
    db.flush()

    for slot_data in payload.slots:
        slot = AvailabilitySlot(
            schedule_id=schedule.id,
            day_of_week=slot_data.day_of_week,
            start_time=slot_data.start_time,
            end_time=slot_data.end_time,
        )
        db.add(slot)

    db.commit()
    db.refresh(schedule)
    return schedule


@router.get("/availability", response_model=List[AvailabilityScheduleResponse])
def list_schedules(db: Session = Depends(get_db)):
    user = _get_default_user(db)
    return (
        db.query(AvailabilitySchedule)
        .filter(AvailabilitySchedule.user_id == user.id)
        .all()
    )


@router.get("/availability/{schedule_id}", response_model=AvailabilityScheduleResponse)
def get_schedule(schedule_id: UUID, db: Session = Depends(get_db)):
    schedule = db.query(AvailabilitySchedule).filter(AvailabilitySchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(404, "Availability schedule not found")
    return schedule


@router.put("/availability/{schedule_id}", response_model=AvailabilityScheduleResponse)
def update_schedule(schedule_id: UUID, payload: AvailabilityScheduleUpdate, db: Session = Depends(get_db)):
    schedule = db.query(AvailabilitySchedule).filter(AvailabilitySchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(404, "Availability schedule not found")

    if payload.name is not None:
        schedule.name = payload.name

    if payload.is_default is not None:
        if payload.is_default:
            db.query(AvailabilitySchedule).filter(
                AvailabilitySchedule.user_id == schedule.user_id,
                AvailabilitySchedule.is_default == True,
                AvailabilitySchedule.id != schedule.id,
            ).update({"is_default": False})
        schedule.is_default = payload.is_default

    if payload.slots is not None:
        # Replace all slots
        db.query(AvailabilitySlot).filter(AvailabilitySlot.schedule_id == schedule.id).delete()
        for slot_data in payload.slots:
            slot = AvailabilitySlot(
                schedule_id=schedule.id,
                day_of_week=slot_data.day_of_week,
                start_time=slot_data.start_time,
                end_time=slot_data.end_time,
            )
            db.add(slot)

    db.commit()
    db.refresh(schedule)
    return schedule


@router.delete("/availability/{schedule_id}", status_code=204)
def delete_schedule(schedule_id: UUID, db: Session = Depends(get_db)):
    schedule = db.query(AvailabilitySchedule).filter(AvailabilitySchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(404, "Availability schedule not found")
    db.delete(schedule)
    db.commit()
