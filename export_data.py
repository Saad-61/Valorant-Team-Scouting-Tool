"""
Export DuckDB data to SQL files for PostgreSQL import
Run this locally before migrating to Supabase
"""
import duckdb
from pathlib import Path

DB_PATH = Path(__file__).parent / "valorant_esports.duckdb"

def export_to_sql():
    conn = duckdb.connect(str(DB_PATH), read_only=True)
    
    # Get all tables
    tables = conn.execute("SHOW TABLES").fetchall()
    print(f"Found {len(tables)} tables: {[t[0] for t in tables]}")
    
    for (table_name,) in tables:
        print(f"\nExporting {table_name}...")
        
        # Get schema
        schema = conn.execute(f"DESCRIBE {table_name}").fetchall()
        
        # Get data
        data = conn.execute(f"SELECT * FROM {table_name}").fetchall()
        columns = [desc[0] for desc in conn.execute(f"DESCRIBE {table_name}").fetchall()]
        
        # Write to CSV for easy import
        output_file = Path(__file__).parent / f"export_{table_name}.csv"
        
        # Export to CSV using DuckDB
        conn.execute(f"COPY {table_name} TO '{output_file}' (HEADER, DELIMITER ',')")
        print(f"  Exported {len(data)} rows to {output_file}")
    
    conn.close()
    print("\n✅ Export complete! Upload CSV files to Supabase.")

if __name__ == "__main__":
    export_to_sql()
