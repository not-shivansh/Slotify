from uuid import UUID
from typing import List
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DateOverride, User
from app.schemas import DateOverrideCreate, DateOverrideUpdate, DateOverrideResponse

router = APIRouter()


def _get_default_user(db: Session) -> User:
    user = db.query(User).first()
    if not user:
        user = User(name="Default User", email="user@slotify.local")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.post("/overrides", response_model=DateOverrideResponse, status_code=201)
def create_override(payload: DateOverrideCreate, db: Session = Depends(get_db)):
    user = _get_default_user(db)

    existing = (
        db.query(DateOverride)
        .filter(DateOverride.user_id == user.id, DateOverride.date == payload.date)
        .first()
    )
    if existing:
        raise HTTPException(400, f"Override for {payload.date} already exists")

    override = DateOverride(
        user_id=user.id,
        date=payload.date,
        is_unavailable=payload.is_unavailable,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    db.add(override)
    db.commit()
    db.refresh(override)
    return override


@router.get("/overrides", response_model=List[DateOverrideResponse])
def list_overrides(
    start_date: date_type | None = Query(None),
    end_date: date_type | None = Query(None),
    db: Session = Depends(get_db),
):
    user = _get_default_user(db)
    query = db.query(DateOverride).filter(DateOverride.user_id == user.id)
    if start_date:
        query = query.filter(DateOverride.date >= start_date)
    if end_date:
        query = query.filter(DateOverride.date <= end_date)
    return query.order_by(DateOverride.date).all()


@router.put("/overrides/{override_id}", response_model=DateOverrideResponse)
def update_override(override_id: UUID, payload: DateOverrideUpdate, db: Session = Depends(get_db)):
    override = db.query(DateOverride).filter(DateOverride.id == override_id).first()
    if not override:
        raise HTTPException(404, "Override not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(override, key, value)

    db.commit()
    db.refresh(override)
    return override


@router.delete("/overrides/{override_id}", status_code=204)
def delete_override(override_id: UUID, db: Session = Depends(get_db)):
    override = db.query(DateOverride).filter(DateOverride.id == override_id).first()
    if not override:
        raise HTTPException(404, "Override not found")
    db.delete(override)
    db.commit()
