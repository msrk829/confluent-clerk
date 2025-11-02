"""
FastAPI Main Application
Enterprise Kafka Admin Portal
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.routes import auth, users, requests, admin, kafka, audit
from app.db.database import engine
from app.db import models


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for startup and shutdown"""
    # Startup: Create database tables
    models.Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
    yield
    # Shutdown: Cleanup if needed
    print("👋 Shutting down application")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise Kafka Admin Portal with LDAP Authentication",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/user", tags=["User"])
app.include_router(requests.router, prefix="/api/user/requests", tags=["User Requests"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(kafka.router, prefix="/api/kafka", tags=["Kafka"])
app.include_router(audit.router, prefix="/api/audit", tags=["Audit Logs"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Kafka Admin Portal API",
        "version": "1.0.0",
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "kafka": "not_implemented",
        "ldap": "not_implemented"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
