from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import EventType, User
from app.schemas import EventTypeCreate, EventTypeUpdate, EventTypeResponse

router = APIRouter()


def _get_default_user(db: Session) -> User:
    """Get or create the single default user (no-auth system)."""
    user = db.query(User).first()
    if not user:
        user = User(name="Default User", email="user@slotify.local")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def _slugify(name: str) -> str:
    return name.lower().strip().replace(" ", "-").replace("_", "-")


@router.post("/events", response_model=EventTypeResponse, status_code=201)
def create_event(payload: EventTypeCreate, db: Session = Depends(get_db)):
    user = _get_default_user(db)

    slug = payload.url_slug or _slugify(payload.name)
    # Ensure unique slug
    existing = db.query(EventType).filter(EventType.url_slug == slug).first()
    if existing:
        raise HTTPException(400, f"Slug '{slug}' already exists")

    event = EventType(
        user_id=user.id,
        name=payload.name,
        duration_minutes=payload.duration_minutes,
        url_slug=slug,
        buffer_before=payload.buffer_before,
        buffer_after=payload.buffer_after,
        is_active=payload.is_active,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/events", response_model=List[EventTypeResponse])
def list_events(db: Session = Depends(get_db)):
    user = _get_default_user(db)
    return db.query(EventType).filter(EventType.user_id == user.id).all()


@router.get("/events/{event_id}", response_model=EventTypeResponse)
def get_event(event_id: UUID, db: Session = Depends(get_db)):
    event = db.query(EventType).filter(EventType.id == event_id).first()
    if not event:
        raise HTTPException(404, "Event type not found")
    return event


@router.get("/events/slug/{slug}", response_model=EventTypeResponse)
def get_event_by_slug(slug: str, db: Session = Depends(get_db)):
    event = db.query(EventType).filter(EventType.url_slug == slug).first()
    if not event:
        raise HTTPException(404, "Event type not found")
    return event


@router.put("/events/{event_id}", response_model=EventTypeResponse)
def update_event(event_id: UUID, payload: EventTypeUpdate, db: Session = Depends(get_db)):
    event = db.query(EventType).filter(EventType.id == event_id).first()
    if not event:
        raise HTTPException(404, "Event type not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "url_slug" in update_data and update_data["url_slug"] != event.url_slug:
        existing = db.query(EventType).filter(EventType.url_slug == update_data["url_slug"]).first()
        if existing:
            raise HTTPException(400, f"Slug '{update_data['url_slug']}' already exists")

    for key, value in update_data.items():
        setattr(event, key, value)

    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: UUID, db: Session = Depends(get_db)):
    event = db.query(EventType).filter(EventType.id == event_id).first()
    if not event:
        raise HTTPException(404, "Event type not found")
    db.delete(event)
    db.commit()
