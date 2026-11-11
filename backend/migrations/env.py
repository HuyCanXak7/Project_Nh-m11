from alembic import context

from backend.app.db.database import get_engine, metadata

engine = get_engine()

if context.is_offline_mode():
    context.configure(dialect_name=engine.dialect.name, target_metadata=metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=metadata)
        with context.begin_transaction():
            context.run_migrations()
