import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

try:
    conn = psycopg2.connect(user="postgres", password="admin", host="localhost", port="5432")
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'meditek'")
    exists = cur.fetchone()
    if not exists:
        cur.execute("CREATE DATABASE meditek")
        print("Database meditek created.")
    else:
        print("Database meditek already exists.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Failed to connect to postgres: {e}")
