# Docker Deployment Guide

This guide explains how to run the Medical Appointment System using Docker and Docker Compose.

## Prerequisites

- Docker Desktop installed (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- Git

## Quick Start with Docker Compose

### 1. Clone and Setup

```bash
git clone <repository-url>
cd medical-appointment-system
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` file with your settings:

```env
DB_TYPE=postgres
DB_USER=medical_user
DB_PASSWORD=your_secure_password
DB_NAME=medical_appointments
JWT_SECRET=your_random_jwt_secret_key
```

### 3. Start All Services

```bash
# Start all services (database, backend, frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **PostgreSQL**: localhost:5432

### 4. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (deletes database data)
docker-compose down -v
```

## Docker Compose Services

### PostgreSQL Database
- **Image**: postgres:16-alpine
- **Port**: 5432
- **Data**: Persisted in `postgres_data` volume
- **Initialization**: Automatically runs `medical_appointment_postgres.sql`

### Backend API
- **Built from**: `backend/Dockerfile`
- **Port**: 5000
- **Health check**: `/api/health`
- **Auto-restart**: Yes

### Frontend
- **Built from**: `frontend/Dockerfile`
- **Port**: 3000 (mapped to 80 in container)
- **Web server**: Nginx
- **Auto-restart**: Yes

## Development vs Production

### Development Mode

Use the existing docker-compose.yml for local development:

```bash
docker-compose up -d
```

### Production Mode (Render)

The project is configured for Render deployment with:
- PostgreSQL managed database
- Dockerized backend and frontend
- Environment variables managed in Render dashboard

## Common Docker Commands

```bash
# Build services
docker-compose build

# Rebuild without cache
docker-compose build --no-cache

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Execute commands in containers
docker-compose exec backend sh
docker-compose exec postgres psql -U medical_user -d medical_appointments

# Restart specific service
docker-compose restart backend

# Remove all containers and volumes
docker-compose down -v
```

## Database Management

### Access PostgreSQL

```bash
# Using docker-compose
docker-compose exec postgres psql -U medical_user -d medical_appointments

# List tables
\dt

# Query users
SELECT * FROM users;

# Exit
\q
```

### Backup Database

```bash
docker-compose exec postgres pg_dump -U medical_user medical_appointments > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker-compose exec -T postgres psql -U medical_user -d medical_appointments
```

## Troubleshooting

### Port Conflicts

If ports 3000, 5000, or 5432 are already in use:

1. Edit `docker-compose.yml`
2. Change the left side of port mapping:
   ```yaml
   ports:
     - "3001:3000"  # Use 3001 instead of 3000
   ```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Backend Errors

```bash
# Check backend logs
docker-compose logs -f backend

# Rebuild backend
docker-compose up -d --build backend
```

### Reset Everything

```bash
# Stop all services and remove volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

## Health Checks

All services have health checks:

```bash
# Check backend health
curl http://localhost:5000/api/health

# Check frontend health
curl http://localhost:3000/health

# Check PostgreSQL
docker-compose exec postgres pg_isready -U medical_user
```

## Performance Optimization

### For Production

1. **Use named volumes** for better performance
2. **Enable logging limits**:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

3. **Resource limits**:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '0.5'
         memory: 512M
   ```

## Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Use strong passwords** for database
3. **Change JWT_SECRET** to a random secure string
4. **Update default admin password** after first login
5. **Use HTTPS** in production

## Monitoring

### View Resource Usage

```bash
# All containers
docker stats

# Specific container
docker stats medical-backend
```

### Check Container Health

```bash
docker-compose ps
```

## Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build

# If database schema changed
docker-compose exec postgres psql -U medical_user -d medical_appointments -f /docker-entrypoint-initdb.d/init.sql
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_TYPE` | Database type (mysql/postgres) | `postgres` |
| `DB_HOST` | Database host | `postgres` (in Docker) |
| `DB_USER` | Database user | `medical_user` |
| `DB_PASSWORD` | Database password | `medical_password` |
| `DB_NAME` | Database name | `medical_appointments` |
| `DB_PORT` | Database port | `5432` |
| `NODE_ENV` | Node environment | `production` |
| `PORT` | Backend port | `5000` |
| `JWT_SECRET` | JWT signing key | Required |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:5000/api` |

## CI/CD Integration

The project includes a `render.yaml` blueprint for automated deployment on Render.com with:
- PostgreSQL database service
- Dockerized backend
- Dockerized frontend
- Automatic SSL certificates
- Health monitoring

See main README.md for Render deployment instructions.
