-- Web Vulnerability Scanner Database Setup
-- MySQL Database Creation Script

-- Drop database if exists (BE CAREFUL in production!)
DROP DATABASE IF EXISTS vulnerability_scanner;

-- Create database with UTF-8 support
CREATE DATABASE vulnerability_scanner 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Use the database
USE vulnerability_scanner;

-- Show confirmation
SELECT 'Database vulnerability_scanner created successfully!' AS Status;

-- Show databases
SHOW DATABASES LIKE 'vulnerability_scanner';
