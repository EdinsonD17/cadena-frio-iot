"""
Virtual cooling system (relay + Peltier) simulator.
"""

class VirtualCooling:
    def __init__(self):
        self.active = False
        self.buzzer = False
        self.mode = "AUTO"
        self.target_temp = 4.0
        self.warning_temp = 6.0
        self.cooling_off_temp = 3.5
    
    def apply_auto_control(self, temperature: float, cooling_active: bool = None) -> dict:
        cooling_changed = False
        alert = None
        buzzer_state = False
        
        if self.mode == "AUTO":
            if cooling_active is not None:
                if self.active != bool(cooling_active):
                    self.active = bool(cooling_active)
                    cooling_changed = True
            else:
                if temperature >= self.target_temp and not self.active:
                    self.active = True
                    cooling_changed = True
                elif temperature <= self.cooling_off_temp and self.active:
                    self.active = False
                    cooling_changed = True
            
        if temperature >= self.warning_temp:
            alert = f"Temperature high: {temperature}°C"
            buzzer_state = True
            
        self.buzzer = buzzer_state
            
        return {
            "cooling_changed": cooling_changed,
            "alert": alert,
            "buzzer": buzzer_state
        }
        
    def set_mode(self, mode: str):
        if mode in ["AUTO", "MANUAL"]:
            self.mode = mode
            
    def turn_on(self):
        if self.mode == "MANUAL":
            self.active = True
            
    def turn_off(self):
        if self.mode == "MANUAL":
            self.active = False
            
    def reset(self):
        self.active = False
        self.buzzer = False
        self.mode = "AUTO"
        
    def get_state(self) -> dict:
        return {
            "active": self.active,
            "buzzer": self.buzzer,
            "mode": self.mode,
            "target_temp": self.target_temp,
            "warning_temp": self.warning_temp
        }
