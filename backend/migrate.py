"""
Migration script: Add missing columns to projects table.
Run once: python migrate.py
"""
import asyncio
from app.db.session import engine
from sqlalchemy import text

MIGRATIONS = [
    # Geometry
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS d1 FLOAT",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS d2 FLOAT",
    # Mesh
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS p INTEGER",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS m INTEGER",
    # BoundaryConditions
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS element_type VARCHAR",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS bc_type      VARCHAR",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS plane_state  VARCHAR",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS load_val     FLOAT",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS load_dir     VARCHAR",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS E            FLOAT",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS nu           FLOAT",
    # Results
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS displacements    TEXT",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS max_displacement FLOAT",
]

async def migrate():
    print("=== Running Migration ===")
    async with engine.begin() as conn:
        for sql in MIGRATIONS:
            col = sql.split("ADD COLUMN IF NOT EXISTS")[1].strip().split()[0]
            await conn.execute(text(sql))
            print(f"  [OK] Added column: {col}")
    print("\nMigration completed successfully!")
    print("You can now run: python test_api.py")

asyncio.run(migrate())
