FROM python:3.11-slim

WORKDIR /app

# Khắc phục lỗi in log của Python trong Docker
ENV PYTHONUNBUFFERED=1 

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Lệnh mặc định (sẽ được ghi đè trong docker-compose để chạy migration)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
