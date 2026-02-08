# MySQL Setup Guide for Web Vulnerability Scanner

## 🔧 Installation

### MacOS (using Homebrew)

```bash
# Install MySQL
brew install mysql

# Start MySQL service
brew services start mysql

# Or start manually
mysql.server start
```

### Secure Installation (Recommended)

```bash
# Run MySQL secure installation
mysql_secure_installation
```

You'll be prompted to:
- Set root password
- Remove anonymous users
- Disallow root login remotely
- Remove test database
- Reload privilege tables

**Recommended answers:** Yes to all

---

## 📊 Database Setup

### Option 1: Using SQL Script (Recommended)

```bash
# Login to MySQL as root
mysql -u root -p

# Run the setup script
source setup_database.sql

# Or in one command
mysql -u root -p < setup_database.sql
```

### Option 2: Manual Setup

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE vulnerability_scanner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Verify
SHOW DATABASES;

# Exit
exit;
```

---

## 👤 Create Application User (Recommended for Production)

```sql
-- Login as root first
mysql -u root -p

-- Create user for the application
CREATE USER 'vulnscan_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON vulnerability_scanner.* TO 'vulnscan_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify
SHOW GRANTS FOR 'vulnscan_user'@'localhost';

-- Exit
exit;
```

---

## ⚙️ Configure Backend

### 1. Copy .env.example to .env

```bash
cd BE
cp .env.example .env
```

### 2. Edit .env file

**For development (using root):**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_root_password
DB_NAME=vulnerability_scanner
```

**For production (using app user):**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=vulnscan_user
DB_PASSWORD=your_strong_password
DB_NAME=vulnerability_scanner
```

### 3. Update SECRET_KEY

```bash
# Generate a secure secret key
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Copy the output and paste into .env
SECRET_KEY=<generated_key_here>
```

---

## 🚀 Initialize Database Tables

### Using SQLAlchemy (Automatic - Recommended)

Tables will be created automatically when you start the app:

```bash
# Make sure you're in BE directory and venv is activated
cd BE
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the app (tables will be created automatically)
uvicorn app.main:app --reload
```

SQLAlchemy will create all tables based on your models.

### Using Alembic (For Migrations - Optional)

If you want to use migrations:

```bash
# Initialize Alembic
alembic init alembic

# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migration
alembic upgrade head
```

---

## ✅ Verify Setup

### 1. Check Database Connection

```bash
mysql -u root -p -e "USE vulnerability_scanner; SHOW TABLES;"
```

### 2. Test Backend Connection

```bash
# Start the backend
uvicorn app.main:app --reload

# In another terminal, test the health endpoint
curl http://localhost:8000/health

# Expected output:
# {"status": "healthy"}
```

### 3. Access API Documentation

Open browser: http://localhost:8000/docs

---

## 🔍 Verify Tables Created

```sql
-- Login to MySQL
mysql -u root -p

-- Use database
USE vulnerability_scanner;

-- Show all tables
SHOW TABLES;

-- Expected tables:
-- - users
-- - projects
-- - scans
-- - vulnerabilities
-- - reports
-- - pocs

-- Check table structure
DESCRIBE users;
DESCRIBE projects;
DESCRIBE scans;
DESCRIBE vulnerabilities;
DESCRIBE reports;
DESCRIBE pocs;

-- Exit
exit;
```

---

## 🐛 Troubleshooting

### Connection Refused

```bash
# Check if MySQL is running
brew services list | grep mysql

# Or
ps aux | grep mysql

# Start MySQL if not running
brew services start mysql
```

### Access Denied

```bash
# Reset root password if forgotten
brew services stop mysql
mysqld_safe --skip-grant-tables &
mysql -u root

# In MySQL console:
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
exit;

# Restart MySQL normally
killall mysqld
brew services start mysql
```

### Can't Connect to MySQL Server

```bash
# Check MySQL socket
ls -la /tmp/mysql.sock

# Check MySQL port
lsof -i :3306

# Check MySQL config
cat /opt/homebrew/etc/my.cnf
```

### Port Already in Use

```bash
# Find what's using port 3306
lsof -i :3306

# Kill the process if needed
kill -9 <PID>
```

---

## 📊 Useful MySQL Commands

```sql
-- Show current database
SELECT DATABASE();

-- Show all databases
SHOW DATABASES;

-- Show all tables
SHOW TABLES;

-- Show table structure
DESCRIBE table_name;

-- Show table creation SQL
SHOW CREATE TABLE table_name;

-- Count rows in table
SELECT COUNT(*) FROM table_name;

-- Drop all tables (BE CAREFUL!)
DROP DATABASE vulnerability_scanner;
CREATE DATABASE vulnerability_scanner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 🔒 Security Best Practices

1. **Never use root in production**
   - Create dedicated application user
   - Grant only necessary privileges

2. **Use strong passwords**
   ```bash
   # Generate strong password
   openssl rand -base64 32
   ```

3. **Encrypt sensitive data**
   - `gemini_api_key` should be encrypted
   - Never commit `.env` to git

4. **Regular backups**
   ```bash
   # Backup database
   mysqldump -u root -p vulnerability_scanner > backup_$(date +%Y%m%d).sql
   
   # Restore database
   mysql -u root -p vulnerability_scanner < backup_20260208.sql
   ```

5. **Enable MySQL SSL** (for production)
   ```sql
   SHOW VARIABLES LIKE '%ssl%';
   ```

---

## 🎯 Next Steps

1. ✅ MySQL installed and running
2. ✅ Database created
3. ✅ .env configured
4. ✅ Backend started
5. ✅ Tables created
6. ⏭️ Test API endpoints at http://localhost:8000/docs
7. ⏭️ Create first user via `/api/auth/register`

---

## 📚 Resources

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
