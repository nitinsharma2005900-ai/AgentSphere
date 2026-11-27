import pytest
from fastapi.testclient import TestClient
from ai_service.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"

def test_health_endpoint():
    response = client.get("/api/v1/health/")
    assert response.status_code == 200
    data = response.json()
    assert "active_provider" in data
    assert "providers" in data
    assert data["providers"]["mock"]["status"] == "healthy"

def test_chat_generation_endpoint():
    payload = {
        "messages": [{"role": "user", "content": "Calculate quarterly expenditure"}]
    }
    response = client.post("/api/v1/ai/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "content" in data
    assert data["provider"] in ["gemini", "mock"]
    assert data["usage"]["total_tokens"] > 0

def test_evaluations_endpoint():
    response = client.post("/api/v1/evaluations/run?provider=mock")
    assert response.status_code == 200
    data = response.json()
    assert data["pass_rate_percent"] >= 75.0
    assert data["total_tests"] > 0
