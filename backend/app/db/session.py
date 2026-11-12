import os
from functools import cache

import sqlalchemy as sa


@cache
def get_engine():
    return sa.create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True, hide_parameters=True)
