"""
Magnetic virtual lid sensor simulator.
"""

class VirtualLidSensor:
    def __init__(self):
        self.state = "CLOSED"
    
    def read(self) -> str:
        return self.state
        
    def open(self):
        self.state = "OPEN"
        
    def close(self):
        self.state = "CLOSED"
        
    def toggle(self):
        self.state = "OPEN" if self.state == "CLOSED" else "CLOSED"
        
    def reset(self):
        self.state = "CLOSED"
