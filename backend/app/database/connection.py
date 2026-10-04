import sqlite3, os, threading

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "cold_chain.db"))

_local = threading.local()

def get_db():
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=WAL")
    return _local.conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""CREATE TABLE IF NOT EXISTS sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        temperature REAL,
        level REAL,
        lid_state TEXT,
        cooling INTEGER,
        mode TEXT,
        mqtt_status TEXT,
        valid INTEGER DEFAULT 1
    )""")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings (timestamp)")
    
    cursor.execute("""CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        description TEXT,
        value TEXT
    )""")
    
    cursor.execute("""CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        message TEXT,
        severity TEXT DEFAULT 'warning',
        status TEXT DEFAULT 'active'
    )""")
    
    cursor.execute("""CREATE TABLE IF NOT EXISTS configuration (
        id INTEGER PRIMARY KEY,
        temperature_target REAL DEFAULT 4.0,
        temperature_warning REAL DEFAULT 6.0,
        temperature_cooling_off REAL DEFAULT 3.5
    )""")
    
    cursor.execute("INSERT OR IGNORE INTO configuration (id, temperature_target, temperature_warning, temperature_cooling_off) VALUES (1, 4.0, 6.0, 3.5)")
    conn.commit()
