FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv redis-server ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY ai_service/requirements.txt /app/requirements.txt
RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt
ENV PATH="/opt/venv/bin:${PATH}"
COPY backend/package*.json /app/backend/
RUN cd backend && npm ci
COPY backend /app/backend
RUN cd backend && npm run build && npm prune --omit=dev
COPY ai_service /app/ai_service
COPY infrastructure/start_services.py /app/infrastructure/start_services.py
ENV NODE_ENV=production RUN_WORKER=true REDIS_URL=redis://127.0.0.1:6379 AI_SERVICE_URL=http://127.0.0.1:8000/api/v1
EXPOSE 10000
CMD ["python", "infrastructure/start_services.py"]
