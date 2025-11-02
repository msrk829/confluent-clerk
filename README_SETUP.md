# Kafka Admin Portal - Setup Guide

## 🚀 Quick Start with Docker Compose

### Prerequisites
- Docker and Docker Compose installed
- Ports 5432, 8000, and 5173 available

### 1. Start the Backend and Database

```bash
# From project root
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- FastAPI backend on port 8000

### 2. Verify Backend is Running

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 3. Start the Frontend (in Lovable or locally)

**Option A: In Lovable**
- The frontend will automatically connect to `http://localhost:8000`

**Option B: Local Development**
```bash
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

## 📁 Project Structure

```
kafka-admin-portal/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/        # API endpoints
│   │   ├── core/              # Configuration
│   │   ├── db/                # Database models
│   │   ├── schemas/           # Pydantic schemas
│   │   └── services/          # Business logic
│   ├── Dockerfile
│   ├── main.py                # FastAPI app entry
│   └── requirements.txt
├── src/                       # React frontend
│   ├── components/
│   ├── contexts/
│   ├── pages/
│   └── ...
├── docker-compose.yml         # Docker orchestration
└── README_SETUP.md
```

---

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kafka_admin

# Security
SECRET_KEY=your-secret-key-change-in-production-use-openssl-rand-hex-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# LDAP (configure for your LDAP server)
LDAP_SERVER=ldap://your-ldap-server:389
LDAP_BASE_DN=dc=example,dc=com
LDAP_ADMIN_GROUP=cn=kafka-admins,ou=groups,dc=example,dc=com
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_PASSWORD=admin_password

# Kafka
KAFKA_BOOTSTRAP_SERVERS=avinashnode.infra.alephys.com:12091,avinashnode.infra.alephys.com:12092
KAFKA_SECURITY_PROTOCOL=PLAINTEXT

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173","http://localhost:8080"]
```

---

## 🧪 Testing the Application

### 1. Test Login (Mock Mode)

The backend includes a `MockLDAPService` for testing without a real LDAP server.

**Test Admin User:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "any-password"}'
```

**Test Regular User:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "any-password"}'
```

### 2. Access the UI

1. Navigate to `http://localhost:5173` (or Lovable preview)
2. Login with:
   - Username: `admin` (for admin) or `testuser` (for regular user)
   - Password: any non-empty value

---

## 🔐 Switching to Real LDAP

To use a real LDAP server:

1. **Update `backend/app/services/ldap_service.py`:**
   - The `LDAPService` class is already implemented
   
2. **Update `backend/app/api/routes/auth.py`:**
   - Change line: `from app.services.ldap_service import LDAPService`
   - (Currently using `MockLDAPService` for development)

3. **Configure LDAP in `.env`:**
   ```env
   LDAP_SERVER=ldap://your-ldap-server:389
   LDAP_BASE_DN=dc=yourcompany,dc=com
   LDAP_ADMIN_GROUP=cn=kafka-admins,ou=groups,dc=yourcompany,dc=com
   ```

---

## 📦 Database Migrations

The application auto-creates tables on startup. For production, use Alembic:

```bash
# Initialize migrations
cd backend
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Initial migration"

# Apply migration
alembic upgrade head
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database connection errors
```bash
# Check database is running
docker-compose ps

# Reset database
docker-compose down -v
docker-compose up -d
```

### Frontend can't connect to backend
- Verify backend is running: `curl http://localhost:8000/health`
- Check CORS settings in `backend/app/core/config.py`
- Ensure `AuthContext.tsx` points to correct API URL

---

## 🚢 Production Deployment

### Security Checklist
- ✅ Change `SECRET_KEY` to random 32-byte value
- ✅ Configure real LDAP server
- ✅ Enable HTTPS/TLS
- ✅ Set strong PostgreSQL password
- ✅ Configure Kafka authentication
- ✅ Enable rate limiting
- ✅ Review CORS origins
- ✅ Set up monitoring and logging

### Environment
- Use environment variables (never commit secrets)
- Use Docker secrets or vault for production
- Configure proper database backups
- Set up log aggregation

---

## 📚 Next Steps

1. **Implement remaining API endpoints** (requests, admin, kafka, audit)
2. **Add Kafka integration** (topic creation, ACL management)
3. **Implement frontend pages** (request forms, admin panels)
4. **Add real-time notifications** (WebSocket or polling)
5. **Implement file exports** (audit logs to CSV)
6. **Add unit and integration tests**
7. **Set up CI/CD pipeline**

---

## 📖 API Documentation

Once backend is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## 🤝 Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Review API docs: http://localhost:8000/docs
3. Verify configuration in `.env`

---

**Happy Building! 🎉**
