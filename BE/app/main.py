from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.api import auth, projects, scans, vulnerabilities, reports, pocs

# Import all models so SQLAlchemy knows about them
from app.models import User, Project, Scan, Vulnerability, Report, PoC

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(scans.router, prefix="/api")
app.include_router(vulnerabilities.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(pocs.router, prefix="/api")


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Web Vulnerability Scanner API",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/debug/cors")
def debug_cors():
    """Debug CORS configuration."""
    return {
        "cors_origins": settings.CORS_ORIGINS,
        "allowed_origins_string": settings.ALLOWED_ORIGINS
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
