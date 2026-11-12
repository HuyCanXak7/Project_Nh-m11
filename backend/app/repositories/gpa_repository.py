import sqlalchemy as sa

from app.db.session import get_engine
from app.db.tables import courses, semesters


def get_semester_courses(user_id, semester_id):
    completed = semesters.outerjoin(
        courses, (courses.c.semester_id == semesters.c.id) & courses.c.grade4.is_not(None),
    )
    query = (
        sa.select(courses.c.credits, courses.c.grade4, courses.c.grade10)
        .select_from(completed)
        .where(semesters.c.id == semester_id, semesters.c.user_id == user_id)
    )
    with get_engine().connect() as connection:
        rows = connection.execute(query).all()
    return rows


def get_completed_courses(user_id):
    query = (
        sa.select(courses.c.code, courses.c.credits, courses.c.grade4, courses.c.grade10)
        .join(semesters, courses.c.semester_id == semesters.c.id)
        .where(semesters.c.user_id == user_id, courses.c.grade4.is_not(None))
        .order_by(courses.c.id)
    )
    with get_engine().connect() as connection:
        return connection.execute(query).all()
