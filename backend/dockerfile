FROM python:3.11-slim

WORKDIR /app

# Khắc phục lỗi in log của Python trong Docker
ENV PYTHONUNBUFFERED=1 API_CONTRACT_PATH=/app/api/openapi.json

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY docs/api/openapi.json /app/api/openapi.json

EXPOSE 8000

# Lệnh mặc định (sẽ được ghi đè trong docker-compose để chạy migration)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
