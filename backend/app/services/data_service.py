from app.database.connection import get_db
from datetime import datetime, timedelta

class DataService:
    def save_reading(self, reading: dict):
        conn = get_db()
        cursor = conn.cursor()
        
        timestamp = reading.get("timestamp", datetime.now().isoformat())
        temperature = reading.get("temperature")
        level = reading.get("level")
        lid_state = reading.get("lid_state")
        cooling = 1 if reading.get("cooling") else 0
        mode = reading.get("mode")
        mqtt_status = reading.get("mqtt_status", "CONNECTED")
        valid = 1 if reading.get("valid", True) else 0

        cursor.execute("""
            INSERT INTO sensor_readings (timestamp, temperature, level, lid_state, cooling, mode, mqtt_status, valid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (timestamp, temperature, level, lid_state, cooling, mode, mqtt_status, valid))
        conn.commit()

    def get_current_reading(self) -> dict:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 1")
        row = cursor.fetchone()
        if row:
            return dict(row)
        return {}

    def get_history(self, minutes: int = None) -> list:
        conn = get_db()
        cursor = conn.cursor()
        if minutes:
            time_threshold = (datetime.now() - timedelta(minutes=minutes)).isoformat()
            cursor.execute("SELECT * FROM sensor_readings WHERE timestamp >= ? ORDER BY timestamp ASC", (time_threshold,))
        else:
            cursor.execute("SELECT * FROM sensor_readings ORDER BY timestamp ASC")
        return [dict(r) for r in cursor.fetchall()]

    def get_telemetry_history(self, minutes: int = 15, max_points: int = 400) -> dict:
        conn = get_db()
        cursor = conn.cursor()
        
        try:
            valid_minutes = max(1, min(1440, int(minutes or 15)))
        except (ValueError, TypeError):
            valid_minutes = 15

        cursor.execute("SELECT timestamp FROM sensor_readings ORDER BY timestamp ASC LIMIT 1")
        oldest_row = cursor.fetchone()
        oldest_timestamp = oldest_row["timestamp"] if oldest_row else None

        time_threshold = (datetime.now() - timedelta(minutes=valid_minutes)).isoformat()
        cursor.execute("""
            SELECT timestamp, temperature, level 
            FROM sensor_readings 
            WHERE timestamp >= ? AND temperature IS NOT NULL
            ORDER BY timestamp ASC
        """, (time_threshold,))
        rows = [dict(r) for r in cursor.fetchall()]

        total_records = len(rows)
        if total_records == 0:
            return {
                "points": [],
                "total_records": 0,
                "oldest_timestamp": oldest_timestamp,
                "span_minutes": 0.0,
                "requested_minutes": valid_minutes
            }

        try:
            t_first = datetime.fromisoformat(rows[0]["timestamp"].replace("Z", ""))
            t_last = datetime.fromisoformat(rows[-1]["timestamp"].replace("Z", ""))
            span_minutes = round((t_last - t_first).total_seconds() / 60.0, 1)
        except Exception:
            span_minutes = float(valid_minutes)

        if total_records <= max_points:
            points = [
                {
                    "timestamp": r["timestamp"],
                    "temperature": round(r["temperature"], 2),
                    "level": round(r["level"], 1) if r["level"] is not None else None
                }
                for r in rows
            ]
        else:
            bucket_size = total_records / float(max_points)
            points = []
            for i in range(max_points):
                start_idx = int(i * bucket_size)
                end_idx = int((i + 1) * bucket_size)
                chunk = rows[start_idx:end_idx]
                if not chunk:
                    continue
                mid_ts = chunk[len(chunk) // 2]["timestamp"]
                avg_temp = round(sum(item["temperature"] for item in chunk) / len(chunk), 2)
                valid_levels = [item["level"] for item in chunk if item["level"] is not None]
                avg_level = round(sum(valid_levels) / len(valid_levels), 1) if valid_levels else None
                points.append({
                    "timestamp": mid_ts,
                    "temperature": avg_temp,
                    "level": avg_level
                })

        return {
            "points": points,
            "total_records": total_records,
            "oldest_timestamp": oldest_timestamp,
            "span_minutes": span_minutes,
            "requested_minutes": valid_minutes
        }

    def save_event(self, event_type, description, value=None):
        conn = get_db()
        cursor = conn.cursor()
        timestamp = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO events (timestamp, event_type, description, value)
            VALUES (?, ?, ?, ?)
        """, (timestamp, event_type, description, str(value) if value is not None else None))
        conn.commit()

    def get_events(self, limit=100) -> list:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM events ORDER BY timestamp DESC LIMIT ?", (limit,))
        return [dict(r) for r in cursor.fetchall()]

    def save_alert(self, alert_type, message, severity="warning"):
        conn = get_db()
        cursor = conn.cursor()
        timestamp = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO alerts (timestamp, type, message, severity, status)
            VALUES (?, ?, ?, ?, ?)
        """, (timestamp, alert_type, message, severity, "active"))
        conn.commit()

    def get_alerts(self, status=None, limit=100) -> list:
        conn = get_db()
        cursor = conn.cursor()
        if status:
            cursor.execute("SELECT * FROM alerts WHERE status = ? ORDER BY timestamp DESC LIMIT ?", (status, limit))
        else:
            cursor.execute("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?", (limit,))
        return [dict(r) for r in cursor.fetchall()]

    def get_active_alerts(self) -> list:
        return self.get_alerts(status="active")

    def acknowledge_alert(self, alert_id):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE alerts SET status = 'acknowledged' WHERE id = ?", (alert_id,))
        conn.commit()

    def get_configuration(self) -> dict:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM configuration WHERE id = 1")
        row = cursor.fetchone()
        if row:
            return dict(row)
        return {"temperature_target": 4.0, "temperature_warning": 6.0, "temperature_cooling_off": 3.5}

    def update_configuration(self, config: dict):
        conn = get_db()
        cursor = conn.cursor()
        target = config.get("temperature_target", 4.0)
        warning = config.get("temperature_warning", 6.0)
        cooling_off = config.get("temperature_cooling_off", 3.5)
        cursor.execute("""
            UPDATE configuration 
            SET temperature_target = ?, temperature_warning = ?, temperature_cooling_off = ?
            WHERE id = 1
        """, (target, warning, cooling_off))
        conn.commit()

    def calculate_kpis(self, minutes=None) -> dict:
        conn = get_db()
        cursor = conn.cursor()
        
        where_clause = ""
        params = ()
        if minutes:
            time_threshold = (datetime.now() - timedelta(minutes=minutes)).isoformat()
            where_clause = "AND timestamp >= ?"
            params = (time_threshold,)

        cursor.execute(f"SELECT AVG(temperature) as avg_temp, MAX(temperature) as max_temp, MIN(temperature) as min_temp FROM sensor_readings WHERE valid = 1 {where_clause}", params)
        temp_stats = cursor.fetchone()
        avg_temp = temp_stats["avg_temp"] if temp_stats and temp_stats["avg_temp"] is not None else 0.0
        max_temp = temp_stats["max_temp"] if temp_stats and temp_stats["max_temp"] is not None else 0.0
        min_temp = temp_stats["min_temp"] if temp_stats and temp_stats["min_temp"] is not None else 0.0

        config = self.get_configuration()
        warning_temp = config.get("temperature_warning", 6.0)

        cursor.execute(f"SELECT COUNT(*) as out_of_range FROM sensor_readings WHERE temperature > ? AND valid = 1 {where_clause}", (warning_temp, *params))
        out_of_range_count = cursor.fetchone()["out_of_range"]
        
        # Assuming each reading is every 2 seconds for cycle_interval
        out_of_range_seconds = out_of_range_count * 2

        cursor.execute(f"SELECT COUNT(*) as total_readings FROM sensor_readings WHERE 1=1 {where_clause.replace('AND', 'AND')}", params)
        total_readings = cursor.fetchone()["total_readings"]

        cursor.execute(f"SELECT COUNT(*) as valid_readings FROM sensor_readings WHERE valid = 1 {where_clause}", params)
        valid_readings = cursor.fetchone()["valid_readings"]

        valid_readings_pct = (valid_readings / total_readings * 100) if total_readings > 0 else 100.0

        cursor.execute(f"SELECT COUNT(*) as mqtt_connected FROM sensor_readings WHERE mqtt_status = 'CONNECTED' {where_clause}", params)
        mqtt_connected = cursor.fetchone()["mqtt_connected"]

        mqtt_availability_pct = (mqtt_connected / total_readings * 100) if total_readings > 0 else 100.0

        cursor.execute(f"SELECT COUNT(*) as alerts_count FROM alerts")
        alerts_count = cursor.fetchone()["alerts_count"]

        cursor.execute(f"SELECT COUNT(*) as events_count FROM events")
        events_count = cursor.fetchone()["events_count"]
        
        cursor.execute(f"SELECT COUNT(*) as cooling_count FROM sensor_readings WHERE cooling = 1 {where_clause}", params)
        cooling_count = cursor.fetchone()["cooling_count"]
        cooling_time = cooling_count * 2

        return {
            "avg_temp": round(avg_temp, 2),
            "max_temp": round(max_temp, 2),
            "min_temp": round(min_temp, 2),
            "out_of_range_seconds": out_of_range_seconds,
            "valid_readings_pct": round(valid_readings_pct, 2),
            "mqtt_availability_pct": round(mqtt_availability_pct, 2),
            "alerts_count": alerts_count,
            "events_count": events_count,
            "cooling_time": cooling_time,
            "readings_count": total_readings
        }

    def clear_all(self):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sensor_readings")
        cursor.execute("DELETE FROM events")
        cursor.execute("DELETE FROM alerts")
        conn.commit()
