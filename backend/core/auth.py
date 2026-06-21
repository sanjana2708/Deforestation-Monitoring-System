import hashlib
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Tuple

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

_CORE_DIR = Path(__file__).resolve().parent
_BACKEND_ROOT = _CORE_DIR.parent
DB_PATH = _BACKEND_ROOT / 'data' / 'users.db'

# Ensure the parent directory (data) exists
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

@contextmanager
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    """Create the users and sessions tables if they do not exist."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (email) REFERENCES users (email) ON DELETE CASCADE
            )
        """)
        
        conn.commit()

def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    """Hash password using scrypt."""
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.scrypt(
        password.encode('utf-8'),
        salt=salt.encode('utf-8'),
        n=16384,
        r=8,
        p=1
    ).hex()
    return hashed, salt

def verify_password(password: str, password_hash: str, salt: str) -> bool:
    """Verify password matches hashed signature."""
    hashed, _ = hash_password(password, salt)
    return secrets.compare_digest(hashed, password_hash)

def register_user(email: str, password: str) -> bool:
    """Register a new user. Returns True if created, False if user already exists."""
    email = email.strip().lower()
    hashed_pwd, salt = hash_password(password)
    
    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO users (email, password_hash, salt) VALUES (?, ?, ?)",
                (email, hashed_pwd, salt)
            )
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            # User already exists
            return False

def authenticate_user(email: str, password: str) -> bool:
    """Verify user credentials."""
    email = email.strip().lower()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash, salt FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        if not row:
            return False
        return verify_password(password, row['password_hash'], row['salt'])

def create_session(email: str, expires_in_days: int = 7) -> str:
    """Create a new session token for the user."""
    email = email.strip().lower()
    token = secrets.token_hex(32)
    expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
    
    with get_db() as conn:
        cursor = conn.cursor()
        # Insert session
        cursor.execute(
            "INSERT INTO sessions (token, email, expires_at) VALUES (?, ?, ?)",
            (token, email, expires_at.isoformat())
        )
        conn.commit()
    return token

def verify_session(token: str) -> Optional[str]:
    """Verify if a session token is valid and returns the user email."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT email, expires_at FROM sessions WHERE token = ?", (token,))
        row = cursor.fetchone()
        if not row:
            return None
        
        expires_at = datetime.fromisoformat(row['expires_at'])
        if expires_at < datetime.utcnow():
            # Session expired, clean it up
            cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()
            return None
            
        return row['email']

def delete_session(token: str):
    """Delete a session token on logout."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()

# FastAPI Dependency for authentication
security_scheme = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    token: Optional[str] = None
) -> str:
    """FastAPI dependency to secure routes and return the current user's email."""
    tok = None
    if credentials:
        tok = credentials.credentials
    elif token:
        tok = token

    if not tok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header or token parameter",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email = verify_session(tok)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return email
