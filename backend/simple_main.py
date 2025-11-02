"""
Simplified FastAPI Main Application for Development
Enterprise Kafka Admin Portal - No Database Version
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Kafka Admin Portal",
    description="Enterprise Kafka Admin Portal with LDAP Authentication",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Kafka Admin Portal API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "not connected (development mode)",
        "message": "Backend is running in development mode"
    }

@app.post("/api/auth/login")
async def login(credentials: dict):
    """Mock login endpoint for development"""
    username = credentials.get("username", "")
    password = credentials.get("password", "")
    
    if username and password:
        # Mock successful login
        return {
            "access_token": "mock_token_123",
            "token_type": "bearer",
            "user": {
                "username": username,
                "email": f"{username}@example.com",
                "is_admin": username == "admin"
            }
        }
    else:
        return {"error": "Invalid credentials"}, 401

@app.get("/api/user/profile")
async def get_user_profile():
    """Mock user profile endpoint"""
    return {
        "username": "testuser",
        "email": "testuser@example.com",
        "is_admin": False
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "simple_main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )