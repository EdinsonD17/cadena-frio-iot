import asyncio
import logging
from amqtt.broker import Broker

logger = logging.getLogger("mqtt_broker")

config = {
    'listeners': {
        'default': {
            'type': 'tcp',
            'bind': '0.0.0.0:1883',
        }
    },
    'sys_interval': 10,
    'auth': {
        'allow-anonymous': True,
    }
}

async def main():
    broker = Broker(config)
    await broker.start()
    print("[MQTT BROKER] Broker MQTT iniciado en el puerto 1883 (0.0.0.0:1883)...")
    try:
        while True:
            await asyncio.sleep(3600)
    except (KeyboardInterrupt, SystemExit):
        await broker.shutdown()

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
