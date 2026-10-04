FROM python:3.11-slim
WORKDIR /app
COPY simulator/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY simulator/ ./simulator/
EXPOSE 8001
CMD ["python", "-m", "simulator.virtual_esp32"]
