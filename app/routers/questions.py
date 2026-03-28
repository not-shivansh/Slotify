from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CustomQuestion, EventType
from app.schemas import CustomQuestionCreate, CustomQuestionUpdate, CustomQuestionResponse

router = APIRouter()


@router.post(
    "/events/{event_id}/questions",
    response_model=CustomQuestionResponse,
    status_code=201,
)
def create_question(event_id: UUID, payload: CustomQuestionCreate, db: Session = Depends(get_db)):
    event = db.query(EventType).filter(EventType.id == event_id).first()
    if not event:
        raise HTTPException(404, "Event type not found")

    question = CustomQuestion(
        event_type_id=event.id,
        question_text=payload.question_text,
        is_required=payload.is_required,
        order=payload.order,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.get("/events/{event_id}/questions", response_model=List[CustomQuestionResponse])
def list_questions(event_id: UUID, db: Session = Depends(get_db)):
    return (
        db.query(CustomQuestion)
        .filter(CustomQuestion.event_type_id == event_id)
        .order_by(CustomQuestion.order)
        .all()
    )


@router.put("/questions/{question_id}", response_model=CustomQuestionResponse)
def update_question(question_id: UUID, payload: CustomQuestionUpdate, db: Session = Depends(get_db)):
    question = db.query(CustomQuestion).filter(CustomQuestion.id == question_id).first()
    if not question:
        raise HTTPException(404, "Question not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(question, key, value)

    db.commit()
    db.refresh(question)
    return question


@router.delete("/questions/{question_id}", status_code=204)
def delete_question(question_id: UUID, db: Session = Depends(get_db)):
    question = db.query(CustomQuestion).filter(CustomQuestion.id == question_id).first()
    if not question:
        raise HTTPException(404, "Question not found")
    db.delete(question)
    db.commit()
