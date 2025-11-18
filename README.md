# Medical Appointment System

A full-stack web application for managing medical appointments between patients and doctors.

## Features

- 👥 **User Management**: Admin, Doctor, and Patient roles
- 📅 **Appointment Booking**: Patients can schedule appointments with doctors
- 🏥 **Doctor Profiles**: Specializations and contact information
- 🔐 **Authentication**: JWT-based secure authentication
- 📊 **Admin Panel**: System management dashboard

## Tech Stack

### Frontend
- React 18
- React Router DOM
- Axios
- CSS3
- Nginx (production)

### Backend
- Node.js
- Express.js
- JWT Authentication
- bcryptjs

### Database
- **Development**: MySQL or PostgreSQL
- **Production**: PostgreSQL
- Supports both MySQL and PostgreSQL with auto-detection

### DevOps
- Docker & Docker Compose
- Render.com deployment ready
- CI/CD with render.yaml blueprint

## Quick Start with Docker

The easiest way to run the application is using Docker Compose:

```bash
# Clone repository
git clone <repository-url>
cd medical-appointment-system

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Start all services (PostgreSQL + Backend + Frontend)
docker-compose up -d

# View logs
docker-compose logs -f
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Database**: localhost:5432

📖 **For detailed Docker instructions, see [DOCKER.md](./DOCKER.md)**

## Deployment on Render

### Architecture

The application uses:
- **PostgreSQL Database**: Managed PostgreSQL service on Render
- **Backend**: Dockerized Node.js API
- **Frontend**: Dockerized React app with Nginx

### Prerequisites
1. GitHub account with this repository
2. Render account (free tier available)

### Deployment Steps

#### 1. Push to GitHub

```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

#### 2. Deploy on Render

**Option A: Using Blueprint (Recommended)**

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and create:
   - PostgreSQL database service
   - Backend web service
   - Frontend web service

**Option B: Manual Setup**

See detailed instructions in the sections below.

#### 3. Configure Services

The `render.yaml` file automatically configures:

- **Database**: PostgreSQL 16 with persistent storage
- **Backend**: 
  - Docker runtime
  - Health checks at `/api/health`
  - Auto-generated JWT secret
  - Connected to PostgreSQL
- **Frontend**:
  - Docker runtime with Nginx
  - Optimized static file serving
  - CORS configured for backend

#### 4. Environment Variables

All required environment variables are automatically set via `render.yaml`:

- `DB_TYPE`: `postgres`
- `DB_HOST`: Auto-linked to database service
- `DB_USER`: `medical_user`
- `DB_PASSWORD`: Auto-generated
- `JWT_SECRET`: Auto-generated
- `FRONTEND_URL`: Auto-set to frontend URL
- `NODE_ENV`: `production`

#### 5. Database Initialization

After database service starts:

1. Connect to your database via Render dashboard
2. Run the PostgreSQL schema:
   ```bash
   psql $DATABASE_URL < medical_appointment_postgres.sql
   ```

Or use the Render shell:
```bash
# In database service shell
psql $DATABASE_URL -f /path/to/medical_appointment_postgres.sql
```

### Post-Deployment

1. **Update Frontend URL**: Note your backend URL from Render
2. **Change Admin Password**: Login with default credentials and update
3. **Monitor Services**: Check health endpoints and logs

### Render Service URLs

After deployment, you'll have:
- Frontend: `https://medical-appointment-frontend.onrender.com`
- Backend: `https://medical-appointment-backend.onrender.com`
- Database: Internal Render hostname

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 16+ OR MySQL 8+
- npm or yarn

### Database Setup

**Option 1: Using Docker Compose (Recommended)**
```bash
docker-compose up -d postgres
```

**Option 2: Manual PostgreSQL Setup**
```bash
# Install PostgreSQL, then:
psql -U postgres
CREATE DATABASE medical_appointments;
CREATE USER medical_user WITH PASSWORD 'medical_password';
GRANT ALL PRIVILEGES ON DATABASE medical_appointments TO medical_user;
\q

# Import schema
psql -U medical_user -d medical_appointments -f medical_appointment_postgres.sql
```

**Option 3: MySQL Setup**
```bash
mysql -u root -p
CREATE DATABASE medical_appointments;
SOURCE medical_appointment.sql;
```

### Backend Setup

```bash
cd backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env:
# - Set DB_TYPE to 'postgres' or 'mysql'
# - Update database credentials
# - Set JWT_SECRET

# Start development server
npm run dev
```

Backend runs on http://localhost:5000

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on http://localhost:3000

Update `frontend/src/App.js` if needed:
```javascript
axios.defaults.baseURL = 'http://localhost:5000/api';
```

## Database Support

The application supports both MySQL and PostgreSQL:

### Auto-Detection

Set `DB_TYPE` in your `.env` file:
```env
DB_TYPE=postgres  # Use PostgreSQL
# OR
DB_TYPE=mysql     # Use MySQL
```

The `database.js` file automatically loads the correct driver.

### Migration from MySQL to PostgreSQL

1. Export MySQL data:
   ```bash
   mysqldump -u root -p medical_appointments > mysql_backup.sql
   ```

2. Convert to PostgreSQL format (manual adjustments needed):
   - Change `AUTO_INCREMENT` to `SERIAL`
   - Change `ENUM` to PostgreSQL ENUM types
   - Update syntax differences

3. Import to PostgreSQL:
   ```bash
   psql -U medical_user -d medical_appointments -f medical_appointment_postgres.sql
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Appointments
- `GET /api/appointments` - Get user appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/stats` - System statistics

## Environment Variables Reference

### Backend (.env)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` or `production` | No |
| `PORT` | Server port | `5000` | No |
| `DB_TYPE` | Database type | `postgres` or `mysql` | Yes |
| `DB_HOST` | Database host | `localhost` or `postgres` | Yes |
| `DB_USER` | Database user | `medical_user` | Yes |
| `DB_PASSWORD` | Database password | `secure_password` | Yes |
| `DB_NAME` | Database name | `medical_appointments` | Yes |
| `DB_PORT` | Database port | `5432` or `3306` | No |
| `DB_SSL` | Enable SSL for DB | `true` or `false` | No |
| `JWT_SECRET` | JWT signing key | `random_secure_string` | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-app.com` | Yes |

## Default Credentials

After importing the database schema:
- **Email**: admin@medical.com
- **Password**: admin123

⚠️ **Change these credentials immediately after first login!**

## Troubleshooting

### Docker Issues

```bash
# View logs
docker-compose logs -f backend

# Restart services
docker-compose restart

# Clean rebuild
docker-compose down -v
docker-compose up -d --build
```

### Database Connection Issues
- Verify credentials in `.env`
- Check if database service is running
- For PostgreSQL: Ensure SSL settings match
- For Render: Check if DATABASE_URL is set

### CORS Errors
- Verify `FRONTEND_URL` in backend matches your frontend URL exactly
- Check CORS configuration in `backend/server.js`

### Build Failures on Render
- Check Node version compatibility (v18+ recommended)
- Verify Dockerfiles have correct paths
- Check build logs in Render dashboard

## Project Structure

```
medical-appointment-system/
├── backend/
│   ├── routes/           # API routes
│   ├── database.js       # Database connection (multi-DB)
│   ├── database-postgres.js  # PostgreSQL driver
│   ├── server.js         # Express server
│   ├── Dockerfile        # Backend container
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/        # React components
│   │   └── App.js
│   ├── Dockerfile        # Frontend container
│   ├── nginx.conf        # Nginx configuration
│   └── package.json
├── docker-compose.yml    # Local development orchestration
├── render.yaml          # Render deployment blueprint
├── medical_appointment.sql          # MySQL schema
├── medical_appointment_postgres.sql # PostgreSQL schema
├── .env.example         # Environment template
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker Compose
5. Submit a pull request

## License

MIT

## Support

For issues and questions:
- Open an issue on GitHub
- Check [DOCKER.md](./DOCKER.md) for Docker-specific help
- Review Render deployment logs
