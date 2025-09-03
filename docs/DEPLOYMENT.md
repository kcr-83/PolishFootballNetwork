# Deployment Guide

## Overview

This guide covers deployment options for the Polish Football Network application, from development to production environments.

## Prerequisites

- Docker and Docker Compose
- Domain name (for production)
- SSL certificate (for production)
- PostgreSQL database access
- Basic knowledge of containerization

## Development Deployment

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/kcr-83/PolishFootballNetwork.git
   cd PolishFootballNetwork
   ```

2. **Start the development environment**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:5000
   - Database: localhost:5432

### Manual Development Setup

1. **Start PostgreSQL**
   ```bash
   docker run --name pfn-postgres -e POSTGRES_PASSWORD=pfnpassword -e POSTGRES_USER=pfnuser -e POSTGRES_DB=PolishFootballNetwork -p 5432:5432 -d postgres:15-alpine
   ```

2. **Start Backend**
   ```bash
   cd src/PolishFootballNetwork.WebApi
   dotnet restore
   dotnet ef database update
   dotnet run
   ```

3. **Start Frontend**
   ```bash
   cd frontend/polish-football-network-ui
   npm install
   npm start
   ```

## Production Deployment

### Option 1: Docker Compose Production

1. **Prepare environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` file:
   ```env
   # Database
   POSTGRES_DB=PolishFootballNetwork
   POSTGRES_USER=pfnuser
   POSTGRES_PASSWORD=your-secure-password

   # JWT Configuration
   JWT_SECRET_KEY=your-super-secret-key-at-least-32-characters-long
   JWT_ISSUER=PolishFootballNetwork
   JWT_AUDIENCE=PolishFootballNetwork
   JWT_EXPIRATION_MINUTES=60

   # SSL (if using HTTPS)
   SSL_CERT_PATH=/path/to/cert.pem
   SSL_KEY_PATH=/path/to/key.pem
   ```

2. **Deploy with production compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Set up reverse proxy (Nginx/Traefik)**

### Option 2: Kubernetes Deployment

1. **Create namespace**
   ```bash
   kubectl create namespace polish-football-network
   ```

2. **Apply configurations**
   ```bash
   kubectl apply -f k8s/
   ```

### Option 3: Cloud Deployment

#### Azure Container Instances

1. **Build and push images**
   ```bash
   # Build images
   docker build -f docker/Dockerfile.backend -t pfn-backend .
   docker build -f docker/Dockerfile.frontend -t pfn-frontend .

   # Tag and push to Azure Container Registry
   docker tag pfn-backend myregistry.azurecr.io/pfn-backend:latest
   docker tag pfn-frontend myregistry.azurecr.io/pfn-frontend:latest
   docker push myregistry.azurecr.io/pfn-backend:latest
   docker push myregistry.azurecr.io/pfn-frontend:latest
   ```

2. **Create Azure resources**
   ```bash
   az group create --name pfn-rg --location eastus
   az postgres server create --resource-group pfn-rg --name pfn-db --admin-user pfnuser --admin-password SecurePassword123
   ```

#### AWS ECS/Fargate

1. **Create ECR repositories**
   ```bash
   aws ecr create-repository --repository-name pfn-backend
   aws ecr create-repository --repository-name pfn-frontend
   ```

2. **Build and push images**
   ```bash
   $(aws ecr get-login --no-include-email)
   docker build -f docker/Dockerfile.backend -t pfn-backend .
   docker tag pfn-backend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/pfn-backend:latest
   docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/pfn-backend:latest
   ```

## Database Configuration

### PostgreSQL Setup

1. **Create production database**
   ```sql
   CREATE DATABASE PolishFootballNetwork;
   CREATE USER pfnuser WITH PASSWORD 'your-secure-password';
   GRANT ALL PRIVILEGES ON DATABASE PolishFootballNetwork TO pfnuser;
   ```

2. **Run migrations**
   ```bash
   dotnet ef database update --project src/PolishFootballNetwork.Persistence --connection "Host=your-db-host;Database=PolishFootballNetwork;Username=pfnuser;Password=your-password"
   ```

3. **Seed initial data**
   ```bash
   dotnet run --project src/PolishFootballNetwork.WebApi -- --seed-data
   ```

### Database Performance Optimization

1. **Create indexes**
   ```sql
   CREATE INDEX idx_clubs_league ON clubs(league);
   CREATE INDEX idx_clubs_city ON clubs(city);
   CREATE INDEX idx_connections_type ON connections(connection_type);
   ```

2. **Configure connection pooling**
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=localhost;Database=PolishFootballNetwork;Username=pfnuser;Password=password;Pooling=true;MinPoolSize=0;MaxPoolSize=100"
     }
   }
   ```

## SSL/TLS Configuration

### Using Let's Encrypt

1. **Install Certbot**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. **Obtain certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Auto-renewal**
   ```bash
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

### Using custom certificates

1. **Place certificates**
   ```bash
   mkdir -p ssl
   cp your-cert.pem ssl/
   cp your-key.pem ssl/
   ```

2. **Update nginx configuration**
   ```nginx
   server {
       listen 443 ssl;
       ssl_certificate /etc/nginx/ssl/your-cert.pem;
       ssl_certificate_key /etc/nginx/ssl/your-key.pem;
   }
   ```

## Environment Configuration

### Backend Configuration

**appsettings.Production.json**
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "Host=database;Database=PolishFootballNetwork;Username=pfnuser;Password=${POSTGRES_PASSWORD}"
  },
  "JwtSettings": {
    "SecretKey": "${JWT_SECRET_KEY}",
    "Issuer": "${JWT_ISSUER}",
    "Audience": "${JWT_AUDIENCE}",
    "ExpirationMinutes": 60
  },
  "FileStorage": {
    "BasePath": "/app/uploads",
    "MaxFileSize": 5242880,
    "AllowedExtensions": [".svg", ".png", ".jpg", ".jpeg"]
  },
  "Cors": {
    "Origins": ["https://your-domain.com"]
  }
}
```

### Frontend Configuration

**environment.prod.ts**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-domain.com/api',
  enableAnalytics: true,
  logLevel: 'error'
};
```

## Monitoring and Logging

### Application Insights (Azure)

1. **Add Application Insights**
   ```json
   {
     "ApplicationInsights": {
       "InstrumentationKey": "your-instrumentation-key"
     }
   }
   ```

2. **Configure logging**
   ```csharp
   builder.Services.AddApplicationInsightsTelemetry();
   ```

### Serilog Configuration

```json
{
  "Serilog": {
    "Using": ["Serilog.Sinks.Console", "Serilog.Sinks.File"],
    "MinimumLevel": "Information",
    "WriteTo": [
      { "Name": "Console" },
      {
        "Name": "File",
        "Args": {
          "path": "/app/logs/app-.log",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 30
        }
      }
    ]
  }
}
```

## Performance Optimization

### Backend Optimizations

1. **Enable response compression**
   ```csharp
   builder.Services.AddResponseCompression();
   ```

2. **Configure caching**
   ```csharp
   builder.Services.AddMemoryCache();
   builder.Services.AddResponseCaching();
   ```

3. **Database query optimization**
   ```csharp
   // Use projections for large datasets
   var clubs = await context.Clubs
       .Select(c => new ClubDto { Id = c.Id, Name = c.Name })
       .ToListAsync();
   ```

### Frontend Optimizations

1. **Enable production build optimizations**
   ```json
   {
     "budgets": [
       {
         "type": "initial",
         "maximumWarning": "500kb",
         "maximumError": "1mb"
       }
     ]
   }
   ```

2. **Lazy loading modules**
   ```typescript
   const routes: Routes = [
     {
       path: 'admin',
       loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
     }
   ];
   ```

## Backup and Recovery

### Database Backups

1. **Automated backups**
   ```bash
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   pg_dump -h localhost -U pfnuser PolishFootballNetwork > backup_$DATE.sql
   
   # Upload to cloud storage
   aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
   ```

2. **Backup verification**
   ```bash
   pg_restore --list backup_$DATE.sql
   ```

### File Storage Backups

```bash
# Sync uploads to cloud storage
rsync -av --delete /app/uploads/ /backup/uploads/
aws s3 sync /app/uploads/ s3://your-storage-bucket/uploads/
```

## Health Checks

### Application Health Checks

```csharp
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>()
    .AddNpgSql(connectionString)
    .AddCheck<FileStorageHealthCheck>("file-storage");
```

### Monitoring Endpoints

- `GET /health` - Overall health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## Troubleshooting

### Common Issues

1. **Database connection issues**
   ```bash
   # Check database connectivity
   psql -h database -U pfnuser -d PolishFootballNetwork -c "SELECT 1;"
   ```

2. **File permission issues**
   ```bash
   # Fix upload directory permissions
   chmod -R 755 /app/uploads
   chown -R appuser:appuser /app/uploads
   ```

3. **Memory issues**
   ```bash
   # Monitor memory usage
   docker stats
   ```

### Log Analysis

```bash
# View application logs
docker logs pfn-backend-prod

# Search for errors
grep -i error /app/logs/app-*.log
```

## Security Considerations

### Production Checklist

- [ ] Use HTTPS everywhere
- [ ] Strong JWT secret key (32+ characters)
- [ ] Database credentials stored securely
- [ ] Regular security updates
- [ ] Input validation enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] File upload restrictions in place
- [ ] Monitoring and alerting active

### Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## Scaling Considerations

### Horizontal Scaling

1. **Load balancer configuration**
2. **Database read replicas**
3. **Redis for session storage**
4. **CDN for static assets**

### Vertical Scaling

1. **Increase container resources**
2. **Database performance tuning**
3. **Connection pool optimization**

This deployment guide provides comprehensive instructions for deploying the Polish Football Network application in various environments. Adjust configurations based on your specific requirements and infrastructure.
