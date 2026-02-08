#!/usr/bin/env python3
"""
Test MySQL database connection
"""
from app.config import settings
from app.database import engine
from sqlalchemy import text

def test_connection():
    print("=" * 60)
    print("Testing MySQL Connection")
    print("=" * 60)
    
    print(f"\nDatabase Config:")
    print(f"  Host: {settings.DB_HOST}")
    print(f"  Port: {settings.DB_PORT}")
    print(f"  User: {settings.DB_USER}")
    print(f"  Database: {settings.DB_NAME}")
    print(f"  Connection URL: {settings.DATABASE_URL}")
    
    try:
        print("\n🔌 Attempting to connect...")
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("✅ Connection successful!")
            
            # Test database
            result = connection.execute(text("SELECT DATABASE()"))
            db_name = result.fetchone()[0]
            print(f"✅ Connected to database: {db_name}")
            
            # Show version
            result = connection.execute(text("SELECT VERSION()"))
            version = result.fetchone()[0]
            print(f"✅ MySQL version: {version}")
            
            print("\n" + "=" * 60)
            print("✅ All tests passed! Database is ready.")
            print("=" * 60)
            return True
            
    except Exception as e:
        print(f"\n❌ Connection failed!")
        print(f"Error: {str(e)}")
        print("\n" + "=" * 60)
        print("Please check:")
        print("1. MySQL is running: brew services list | grep mysql")
        print("2. .env file has correct credentials")
        print("3. Database exists: mysql -u root -e 'SHOW DATABASES;'")
        print("=" * 60)
        return False

if __name__ == "__main__":
    test_connection()
