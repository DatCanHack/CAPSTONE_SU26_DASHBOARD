from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.config import settings
from app.database import engine, Base
from app.api import auth, projects, scans, vulnerabilities, reports, pocs

# Import all models so SQLAlchemy knows about them
from app.models import User, Project, Scan, Vulnerability, Report, PoC

# Create database tables
Base.metadata.create_all(bind=engine)

# Auto-migrate: Add new columns if they don't exist
def run_migrations():
    """Add new columns to existing tables if they don't exist."""
    migrations = [
        # Projects table - source code type info
        ("projects", "source_code_type", "ALTER TABLE projects ADD COLUMN source_code_type VARCHAR(20) NULL"),
        ("projects", "source_code_name", "ALTER TABLE projects ADD COLUMN source_code_name VARCHAR(255) NULL"),
        ("projects", "source_code_file_count", "ALTER TABLE projects ADD COLUMN source_code_file_count INT NULL"),
        # Scans table - source code info (copied from project at scan creation)
        ("scans", "source_code_path", "ALTER TABLE scans ADD COLUMN source_code_path VARCHAR(500) NULL"),
        ("scans", "source_code_type", "ALTER TABLE scans ADD COLUMN source_code_type VARCHAR(20) NULL"),
        ("scans", "source_code_name", "ALTER TABLE scans ADD COLUMN source_code_name VARCHAR(255) NULL"),
        ("scans", "source_code_file_count", "ALTER TABLE scans ADD COLUMN source_code_file_count INT NULL"),
        ("scans", "source_code_size", "ALTER TABLE scans ADD COLUMN source_code_size INT NULL"),
    ]
    
    with engine.connect() as conn:
        for table, column, sql in migrations:
            try:
                # Check if column exists
                result = conn.execute(text(
                    f"SELECT COUNT(*) FROM information_schema.columns "
                    f"WHERE table_name = '{table}' AND column_name = '{column}'"
                ))
                if result.scalar() == 0:
                    conn.execute(text(sql))
                    conn.commit()
                    print(f"[MIGRATION] Added column {table}.{column}")
            except Exception as e:
                print(f"[MIGRATION] Skipped {table}.{column}: {e}")

# Run migrations on startup
try:
    run_migrations()
except Exception as e:
    print(f"[MIGRATION] Migration failed: {e}")

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
