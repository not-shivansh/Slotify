import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Boolean, Date, Time, DateTime,
    ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    timezone = Column(String(50), nullable=False, default="Asia/Kolkata")
    created_at = Column(DateTime, default=datetime.utcnow)

    event_types = relationship("EventType", back_populates="user", cascade="all, delete-orphan")
    availability_schedules = relationship("AvailabilitySchedule", back_populates="user", cascade="all, delete-orphan")
    date_overrides = relationship("DateOverride", back_populates="user", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# EventType
# ---------------------------------------------------------------------------
class EventType(Base):
    __tablename__ = "event_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=30)
    url_slug = Column(String(200), nullable=False, unique=True)
    buffer_before = Column(Integer, nullable=False, default=0)
    buffer_after = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="event_types")
    bookings = relationship("Booking", back_populates="event_type", cascade="all, delete-orphan")
    custom_questions = relationship("CustomQuestion", back_populates="event_type", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# AvailabilitySchedule
# ---------------------------------------------------------------------------
class AvailabilitySchedule(Base):
    __tablename__ = "availability_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(120), nullable=False, default="Default")
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="availability_schedules")
    slots = relationship("AvailabilitySlot", back_populates="schedule", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# AvailabilitySlot
# ---------------------------------------------------------------------------
class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    schedule_id = Column(UUID(as_uuid=True), ForeignKey("availability_schedules.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday … 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    schedule = relationship("AvailabilitySchedule", back_populates="slots")


# ---------------------------------------------------------------------------
# DateOverride
# ---------------------------------------------------------------------------
class DateOverride(Base):
    __tablename__ = "date_overrides"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    is_unavailable = Column(Boolean, default=False)
    start_time = Column(Time, nullable=True)  # null when is_unavailable=True
    end_time = Column(Time, nullable=True)

    user = relationship("User", back_populates="date_overrides")

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_user_date_override"),
    )


# ---------------------------------------------------------------------------
# Booking
# ---------------------------------------------------------------------------
class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type_id = Column(UUID(as_uuid=True), ForeignKey("event_types.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    invitee_name = Column(String(200), nullable=False)
    invitee_email = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="confirmed")  # confirmed | cancelled | rescheduled
    rescheduled_to_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    event_type = relationship("EventType", back_populates="bookings")
    answers = relationship("Answer", back_populates="booking", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# CustomQuestion
# ---------------------------------------------------------------------------
class CustomQuestion(Base):
    __tablename__ = "custom_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type_id = Column(UUID(as_uuid=True), ForeignKey("event_types.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    is_required = Column(Boolean, default=False)
    order = Column(Integer, default=0)

    event_type = relationship("EventType", back_populates="custom_questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Answer
# ---------------------------------------------------------------------------
class Answer(Base):
    __tablename__ = "answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("custom_questions.id", ondelete="CASCADE"), nullable=False)
    answer_text = Column(Text, nullable=False)

    booking = relationship("Booking", back_populates="answers")
    question = relationship("CustomQuestion", back_populates="answers")
