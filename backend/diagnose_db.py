import asyncio
from app.db.session import engine
from sqlalchemy import text

async def diagnose():
    print("=== DB Diagnostics ===")
    async with engine.connect() as conn:
        # Check if table exists
        r = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='projects' ORDER BY ordinal_position"
        ))
        cols = [row[0] for row in r]
        print(f"Columns in 'projects' table ({len(cols)} total):")
        for c in cols:
            print(f"  - {c}")
        
        required = ["element_type","bc_type","plane_state","load_val","load_dir","E","nu","max_displacement"]
        missing  = [c for c in required if c not in cols]
        if missing:
            print(f"\nMISSING columns: {missing}")
            print("=> Run migrate.py to fix!")
        else:
            print("\nAll required columns present. OK!")

asyncio.run(diagnose())
