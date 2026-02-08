"""
Script to create a default user for testing.
Run: python create_default_user.py
"""
from app.database import SessionLocal
from app.models.user import User
from app.schemas.user import LLMAnalysisMode
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_default_user():
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == "fptno1@fpt.edu.vn").first()
        if existing_user:
            print("✅ Tài khoản mặc định đã tồn tại:")
            print(f"   Email: fptno1@fpt.edu.vn")
            print(f"   Password: fpt123")
            return
        
        # Create default user
        hashed_password = pwd_context.hash("fpt123")
        default_user = User(
            username="fptno1",
            email="fptno1@fpt.edu.vn",
            hashed_password=hashed_password,
            llm_analysis_mode=LLMAnalysisMode.FINE_TUNE
        )
        
        db.add(default_user)
        db.commit()
        db.refresh(default_user)
        
        print("✅ Tạo tài khoản mặc định thành công!")
        print(f"   Email: fptno1@fpt.edu.vn")
        print(f"   Password: fpt123")
        print(f"   Username: fptno1")
        
    except Exception as e:
        print(f"❌ Lỗi khi tạo tài khoản: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_default_user()
