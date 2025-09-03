# Polish Football Network

A comprehensive web application for visualizing relationships between Polish football clubs with an interactive graph interface and administrative management system.

## 🚀 Features

- **Interactive Graph Visualization**: Explore relationships between football clubs using Cytoscape.js
- **Club Management**: Complete CRUD operations for football clubs and their connections
- **Authentication System**: JWT-based authentication with role-based authorization
- **Admin Panel**: Comprehensive administrative interface for data management
- **File Management**: Upload and manage club logos with automatic optimization
- **Responsive Design**: Mobile-friendly interface with Material Design
- **Real-time Updates**: Live data synchronization across the application
- **Performance Optimized**: Efficient rendering for large datasets

## 🏗️ Architecture

The application follows Clean Architecture principles with a clear separation of concerns:

```
src/
├── PolishFootballNetwork.Domain/          # Business entities and rules
├── PolishFootballNetwork.Application/     # Use cases and business logic
├── PolishFootballNetwork.Infrastructure/  # External services and utilities
├── PolishFootballNetwork.Persistence/     # Data access layer
├── PolishFootballNetwork.WebApi/          # API controllers and configuration
└── PolishFootballNetwork.Common/          # Shared utilities and extensions
```

## 🛠️ Technology Stack

### Backend
- **ASP.NET Core 8.0** - Web API framework
- **Entity Framework Core** - Object-relational mapping
- **PostgreSQL** - Primary database
- **JWT Authentication** - Secure token-based auth
- **Serilog** - Structured logging
- **FluentValidation** - Input validation

### Frontend
- **Angular 17+** - Frontend framework with standalone components
- **Angular Material** - UI component library
- **Cytoscape.js** - Graph visualization library
- **TypeScript** - Type-safe development
- **SCSS** - Enhanced CSS with variables and mixins

### DevOps & Testing
- **Docker** - Containerization
- **xUnit** - Unit testing framework
- **Testcontainers** - Integration testing
- **Playwright** - End-to-end testing
- **GitHub Actions** - CI/CD pipeline

## 🚀 Quick Start

### Prerequisites
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 15+](https://www.postgresql.org/)
- [Docker](https://www.docker.com/) (optional)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/kcr-83/PolishFootballNetwork.git
   cd PolishFootballNetwork
   ```

2. **Start with Docker (Recommended)**
   ```bash
   docker-compose up -d
   ```

3. **Manual Setup**

   **Backend:**
   ```bash
   # Restore NuGet packages
   dotnet restore
   
   # Update database connection string in appsettings.json
   # Run database migrations
   dotnet ef database update --project src/PolishFootballNetwork.Persistence
   
   # Start the API
   dotnet run --project src/PolishFootballNetwork.WebApi
   ```

   **Frontend:**
   ```bash
   cd frontend/polish-football-network-ui
   npm install
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:5000
   - Swagger UI: http://localhost:5000/swagger

### Default Credentials
- **Admin User**: admin@pfn.com / Admin123!

## 📚 API Documentation

The API is fully documented using OpenAPI/Swagger. Once the application is running, visit:
- Swagger UI: http://localhost:5000/swagger
- OpenAPI JSON: http://localhost:5000/swagger/v1/swagger.json

### Key Endpoints

#### Public Endpoints
- `GET /api/clubs` - Get all clubs with pagination
- `GET /api/clubs/{id}` - Get club details
- `GET /api/connections` - Get all connections
- `GET /api/graph-data` - Get graph visualization data

#### Admin Endpoints (Requires Authentication)
- `POST /api/admin/clubs` - Create new club
- `PUT /api/admin/clubs/{id}` - Update club
- `DELETE /api/admin/clubs/{id}` - Delete club
- `POST /api/admin/clubs/{id}/upload-logo` - Upload club logo

## 🧪 Testing

### Run All Tests
```bash
dotnet test
```

### Run Specific Test Projects
```bash
# Unit tests
dotnet test tests/PolishFootballNetwork.UnitTests

# Integration tests
dotnet test tests/PolishFootballNetwork.IntegrationTests

# E2E tests
dotnet test tests/PolishFootballNetwork.E2ETests
```

### Frontend Tests
```bash
cd frontend/polish-football-network-ui
npm test
npm run e2e
```

## 📦 Deployment

### Production Deployment with Docker

1. **Set environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Manual Deployment

1. **Build the application**
   ```bash
   # Backend
   dotnet publish src/PolishFootballNetwork.WebApi -c Release -o ./publish
   
   # Frontend
   cd frontend/polish-football-network-ui
   npm run build --prod
   ```

2. **Deploy to your hosting platform**

## 🔧 Configuration

### Backend Configuration (appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=PolishFootballNetwork;Username=pfnuser;Password=pfnpassword"
  },
  "JwtSettings": {
    "SecretKey": "YourSecretKeyHere",
    "Issuer": "PolishFootballNetwork",
    "Audience": "PolishFootballNetwork",
    "ExpirationMinutes": 60
  }
}
```

### Frontend Configuration (environment.ts)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api'
};
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines
- Follow Clean Architecture principles
- Write comprehensive tests
- Use conventional commits
- Update documentation for new features
- Ensure all CI checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs or request features via GitHub Issues
- **Discussions**: Join the conversation in GitHub Discussions

## 🙏 Acknowledgments

- Football club data sourced from official sources
- Built with love for the Polish football community
- Special thanks to all contributors

## 📊 Project Status

![Build Status](https://github.com/kcr-83/PolishFootballNetwork/workflows/CI/badge.svg)
![Coverage](https://img.shields.io/codecov/c/github/kcr-83/PolishFootballNetwork)
![Version](https://img.shields.io/github/v/release/kcr-83/PolishFootballNetwork)
![License](https://img.shields.io/github/license/kcr-83/PolishFootballNetwork)

---

Made with ❤️ for Polish Football
