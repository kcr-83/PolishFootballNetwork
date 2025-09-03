# Polish Football Network - Comprehensive Development Prompts

Based on the feature requirements and implementation guide analysis, here are step-by-step prompts for GitHub Copilot to develop the complete Polish Football Network application.

## Phase 1: Project Foundation & Setup

### Prompt 1.1: Initialize Project Structure
```
Create a complete project structure for Polish Football Network with the following requirements:
- Backend: ASP.NET Core 8.0 Web API with Clean Architecture
- Frontend: Angular 20+ standalone components
- Database: PostgreSQL with Entity Framework Core
- Authentication: JWT-based with role management
- File Storage: Local file system with CDN readiness

Structure:
```
PolishFootballNetwork/
├── src/
│   ├── PolishFootballNetwork.Domain/
│   ├── PolishFootballNetwork.Application/
│   ├── PolishFootballNetwork.Infrastructure/
│   ├── PolishFootballNetwork.Persistence/
│   ├── PolishFootballNetwork.WebApi/
│   └── PolishFootballNetwork.Common/
├── frontend/
│   └── polish-football-network-ui/
├── tests/
│   ├── PolishFootballNetwork.UnitTests/
│   ├── PolishFootballNetwork.IntegrationTests/
│   └── PolishFootballNetwork.E2ETests/
├── docs/
├── docker/
├── Directory.Build.props
├── Directory.Packages.props
└── docker-compose.yml
```

Include proper .NET project references, NuGet package management, and Angular workspace configuration.
```

### Prompt 1.2: Domain Layer Implementation
```
Create the Domain layer for Polish Football Network following DDD principles:

1. Entities:
   - Club: id, name, shortName, slug, league (enum), country, city, region, logoPath, position (value object), founded, stadium, website, colors, description, nickname, motto, isActive, isVerified, isFeatured, metadata
   - Connection: id, fromClubId, toClubId, connectionType (enum), strength (enum), title, description, historicalContext, dates, verification flags, reliability score
   - User: id, username, email, passwordHash, role (enum), profile, security settings, audit fields
   - File: id, filename, path, type, metadata, entity association

2. Value Objects:
   - Point2D: x, y coordinates with validation
   - Money: amount, currency (future use)
   - DateRange: start, end with validation

3. Enums:
   - LeagueType: Ekstraklasa, Fortuna1Liga, EuropeanClub
   - ConnectionType: Alliance, Rivalry, Friendship
   - ConnectionStrength: Weak, Medium, Strong
   - UserRole: Admin, SuperAdmin
   - FileType: LOGO_SVG, IMAGE_PNG, etc.

4. Domain Events:
   - ClubCreated, ClubUpdated, ConnectionEstablished, etc.

5. Repository Interfaces:
   - IClubRepository, IConnectionRepository, IUserRepository, IFileRepository

Include proper validation, business rules, and domain services where needed.
```

### Prompt 1.3: Application Layer with CQRS
```
Create the Application layer implementing CQRS pattern manually (no MediatR):

1. Commands:
   - CreateClubCommand, UpdateClubCommand, DeleteClubCommand
   - CreateConnectionCommand, UpdateConnectionCommand, DeleteConnectionCommand
   - UploadLogoCommand, AuthenticateUserCommand

2. Queries:
   - GetClubsQuery, GetClubByIdQuery, GetClubConnectionsQuery
   - GetConnectionsQuery, GetGraphDataQuery
   - GetDashboardStatsQuery

3. Handlers:
   - Implement ICommandHandler<TCommand, TResult> and IQueryHandler<TQuery, TResult>
   - Include validation using FluentValidation
   - Implement cross-cutting concerns (logging, caching)

4. DTOs:
   - ClubDto, CreateClubDto, UpdateClubDto
   - ConnectionDto, CreateConnectionDto, UpdateConnectionDto
   - GraphDataDto, DashboardStatsDto
   - ApiResponse<T> wrapper

5. Services:
   - IFileService, IAuthenticationService, ICacheService
   - Application-specific services and interfaces

6. Mapping:
   - Manual mapping methods in DTOs (ToDto, FromDto)
   - No AutoMapper dependency - use static mapping methods

Include proper error handling, validation, and business logic implementation.
```

### Prompt 1.4: Infrastructure & Persistence Layers
```
Create Infrastructure and Persistence layers:

1. DbContext (Entity Framework Core):
   - FootballNetworkDbContext with all entities
   - Configure relationships, constraints, and indexes
   - Seed data for initial clubs and admin user
   - Migration strategy

2. Repository Implementations:
   - ClubRepository, ConnectionRepository, UserRepository, FileRepository
   - Implement domain repository interfaces
   - Include async patterns and proper error handling

3. External Services:
   - FileStorageService: upload, delete, validate files
   - EmailService: notifications (future use)
   - CacheService: Redis integration ready

4. Database Configuration:
   - Connection string management
   - Database health checks
   - Retry policies for transient failures

5. Authentication:
   - JwtTokenService: generate, validate, refresh tokens
   - PasswordHashingService: BCrypt implementation
   - AuthenticationSettings configuration

6. Logging:
   - Serilog configuration with structured logging
   - Request logging middleware
   - Performance logging

Configure dependency injection for all services and include proper configuration management.
```

## Phase 2: Web API Implementation

### Prompt 2.1: Authentication & Authorization API
```
Create authentication and authorization system:

1. AuthController:
   - POST /api/auth/login: authenticate user, return JWT
   - POST /api/auth/refresh: refresh token
   - POST /api/auth/logout: invalidate token
   - GET /api/auth/validate: validate current token

2. JWT Configuration:
   - JwtSettings: SecretKey, Issuer, Audience, Expiration
   - Token generation with claims (userId, username, role)
   - Token validation middleware

3. Authorization:
   - [Authorize] attribute usage
   - Role-based authorization policies
   - Custom authorization handlers if needed

4. Security Middleware:
   - Rate limiting for auth endpoints
   - Request logging with user context
   - CORS configuration for Angular frontend

5. Error Handling:
   - Standardized error responses
   - Security-conscious error messages
   - Audit logging for failed attempts

Include proper password hashing, token security, and session management.
```

### Prompt 2.2: Public API Endpoints
```
Create public API endpoints for graph visualization:

1. ClubsController (Public):
   - GET /api/clubs: paginated list with filters (league, country, city)
   - GET /api/clubs/{id}: detailed club information with connections
   - GET /api/clubs/search?q={query}: search clubs by name
   - Include caching headers and response optimization

2. ConnectionsController (Public):
   - GET /api/connections: all active connections with pagination
   - GET /api/connections/by-club/{clubId}: connections for specific club
   - Include filtering by type and strength

3. GraphController (Public):
   - GET /api/graph-data: complete graph data for visualization
   - Optimized response with minimal necessary data
   - Aggressive caching (5 minutes)
   - Compression for large datasets

4. Response Format:
   - Standardized ApiResponse<T> wrapper
   - Pagination metadata
   - Performance metrics in headers

5. Performance:
   - Response compression
   - Conditional requests (ETag)
   - Async/await throughout
   - Query optimization

Include OpenAPI/Swagger documentation for all endpoints.
```

### Prompt 2.3: Admin API Endpoints
```
Create secured admin API endpoints:

1. AdminClubsController:
   - GET /api/admin/clubs: admin view with inactive clubs
   - POST /api/admin/clubs: create new club
   - PUT /api/admin/clubs/{id}: update club
   - DELETE /api/admin/clubs/{id}: soft delete club
   - POST /api/admin/clubs/{id}/upload-logo: logo upload

2. AdminConnectionsController:
   - GET /api/admin/connections: all connections including inactive
   - POST /api/admin/connections: create connection
   - PUT /api/admin/connections/{id}: update connection
   - DELETE /api/admin/connections/{id}: delete connection
   - POST /api/admin/connections/bulk-update: bulk operations

3. AdminDashboardController:
   - GET /api/admin/dashboard/stats: system statistics
   - GET /api/admin/dashboard/recent-activity: recent changes
   - GET /api/admin/dashboard/health: system health check

4. File Management:
   - Multipart file upload with validation
   - SVG file processing and optimization
   - Automatic file naming and path management
   - Cleanup of orphaned files

5. Audit & Logging:
   - All admin actions logged with user context
   - Change tracking for entities
   - Activity logs accessible via API

Include comprehensive validation, authorization checks, and error handling.
```

### Prompt 2.4: Middleware & Configuration
```
Create middleware pipeline and configuration:

1. Middleware:
   - ExceptionHandlingMiddleware: global error handling
   - RequestLoggingMiddleware: structured request/response logging
   - PerformanceMiddleware: request timing and metrics
   - SecurityHeadersMiddleware: security headers

2. Program.cs Configuration:
   - Services registration with DI
   - Middleware pipeline setup
   - Database configuration
   - Authentication/Authorization
   - CORS policy
   - Health checks

3. Configuration Management:
   - appsettings.json structure
   - Environment-specific settings
   - Secret management for production
   - Feature flags configuration

4. Health Checks:
   - Database connectivity
   - File system access
   - External service dependencies
   - Custom health check endpoints

5. API Documentation:
   - Swagger/OpenAPI configuration
   - XML documentation comments
   - Authentication setup in Swagger UI
   - Example requests/responses

Include proper error handling, logging configuration, and production-ready settings.
```

## Phase 3: Angular Frontend Foundation

### Prompt 3.1: Angular Application Structure
```
Create Angular 17+ application with standalone components:

1. Project Setup:
   - Angular CLI configuration
   - TypeScript strict mode
   - ESLint and Prettier setup
   - Angular Material with custom theme

2. Core Module:
   - HTTP interceptors (auth, error, loading)
   - Guards (auth, admin)
   - Services (api, auth, notification)
   - Error handling service

3. Shared Module:
   - Common components (loading, error-display, confirmation-dialog)
   - Pipes (club-filter, connection-type, date formatting)
   - Directives (tooltip, highlight)
   - Utilities and constants

4. Models:
   - TypeScript interfaces matching backend DTOs
   - Enums for League, ConnectionType, etc.
   - API response types
   - Form models

5. Configuration:
   - Environment files (development, production)
   - API base URLs
   - Feature flags
   - App constants

Use standalone components approach with inject() function and modern Angular patterns.
```

### Prompt 3.2: Authentication & Routing
```
Implement authentication and routing system:

1. Auth Service:
   - login(), logout(), isAuthenticated()
   - Token storage in localStorage
   - Auto token refresh logic
   - User state management with signals

2. HTTP Interceptors:
   - AuthInterceptor: add JWT to requests
   - ErrorInterceptor: handle 401/403 responses
   - LoadingInterceptor: global loading state

3. Route Guards:
   - AuthGuard: protect authenticated routes
   - AdminGuard: protect admin-only routes
   - PreventLoggedInGuard: redirect logged users

4. Routing Configuration:
   - Lazy loading for feature modules
   - Route protection with guards
   - Breadcrumb navigation
   - Route-based permissions

5. Login Component:
   - Reactive forms with validation
   - Material Design UI
   - Error handling with user feedback
   - Remember me functionality

Include proper TypeScript typing and error handling throughout.
```

### Prompt 3.3: State Management & Services
```
Create state management and core services:

1. API Service:
   - HTTP client wrapper with proper typing
   - Generic CRUD methods
   - Error handling and retry logic
   - Response caching

2. Club Service:
   - getAllClubs(), getClubById(), searchClubs()
   - CRUD operations for admin
   - Local state management with signals
   - Optimistic updates

3. Connection Service:
   - getConnections(), getConnectionsByClub()
   - CRUD operations for admin
   - Validation helpers

4. Graph Service:
   - loadGraphData()
   - Cytoscape.js integration
   - Graph manipulation methods
   - Export functionality

5. Notification Service:
   - Success/error/warning notifications
   - Toast messages with Material SnackBar
   - Queue management for multiple notifications

Use Angular 17 signals for reactive state management and proper service architecture.
```

## Phase 4: Graph Visualization

### Prompt 4.1: Cytoscape.js Integration
```
Create the graph visualization component using Cytoscape.js:

1. GraphViewerComponent:
   - Cytoscape container with proper sizing
   - Loading states during data fetch
   - Error handling with retry options
   - Export functionality (PNG, SVG, JSON)

2. Graph Configuration:
   - Node styles for different leagues (colors, sizes)
   - Edge styles for connection types (colors, patterns)
   - Layout algorithm (preset positions)
   - Interaction settings (zoom, pan, selection)

3. Graph Service:
   - initializeGraph(): setup Cytoscape instance
   - updateGraph(): refresh data
   - highlightNode(), highlightPath()
   - Event handling (node click, edge hover)

4. Visual Features:
   - Club logos as node backgrounds
   - Connection strength as edge thickness
   - Hover effects and animations
   - Smooth zoom and pan controls

5. Performance:
   - Efficient rendering for 100+ nodes
   - Viewport culling for large graphs
   - Lazy loading of club details
   - Optimized update cycles

Include proper TypeScript types for Cytoscape and responsive design.
```

### Prompt 4.2: Graph Controls & Interaction
```
Add interactive controls and features:

1. Toolbar Component:
   - Zoom in/out buttons
   - Fit to view
   - Reset view
   - Export options (PNG, SVG)
   - Layout selection dropdown

2. Search Component:
   - Real-time club search with autocomplete
   - Highlight matching nodes
   - Center on selected club
   - Search history (last 5 searches)

3. Filter Panel:
   - League checkboxes (Ekstraklasa, 1 Liga, European)
   - Connection type filters
   - Show/hide isolated nodes
   - Apply/reset filters

4. Club Info Panel:
   - Slide-out panel on node click
   - Club details (name, league, stadium, founded)
   - Connections list for selected club
   - Links to official website
   - Edit button for admin users

5. Legend Component:
   - Connection type indicators
   - League classification colors
   - Collapsible/expandable
   - Help tooltips

Include smooth animations and responsive behavior for mobile devices.
```

### Prompt 4.3: Mobile Optimization
```
Optimize graph viewer for mobile devices:

1. Touch Interactions:
   - Touch gestures for zoom/pan
   - Tap to select nodes
   - Double-tap to fit view
   - Pinch-to-zoom support

2. Mobile Layout:
   - Responsive toolbar layout
   - Collapsible panels
   - Bottom sheet for club details
   - Simplified legend for small screens

3. Performance Optimization:
   - Reduced animations on mobile
   - Optimized rendering for touch devices
   - Battery-conscious update cycles
   - Efficient memory usage

4. UX Adaptations:
   - Larger touch targets
   - Swipe gestures for navigation
   - Haptic feedback where supported
   - Simplified UI for small screens

5. Progressive Enhancement:
   - Basic functionality without JavaScript
   - Graceful degradation
   - Offline capabilities (future)
   - PWA readiness

Test on various device sizes and ensure smooth performance.
```

## Phase 5: Admin Panel

### Prompt 5.1: Admin Layout & Navigation
```
Create comprehensive admin panel:

1. Admin Layout Component:
   - Material sidenav with responsive behavior
   - Top toolbar with user info and logout
   - Breadcrumb navigation
   - Router outlet for admin content

2. Navigation Menu:
   - Dashboard with quick stats
   - Club Management (list, create, edit)
   - Connection Management (list, create, edit)
   - File Management (logos, uploads)
   - User Management (future)
   - System Settings

3. Dashboard Component:
   - Statistics cards (total clubs, connections)
   - Recent activity feed
   - Quick action buttons
   - System health indicators
   - Charts/graphs for analytics

4. Responsive Design:
   - Mobile-friendly admin panel
   - Collapsible navigation
   - Touch-optimized controls
   - Adaptive layouts

5. User Experience:
   - Consistent Material Design
   - Intuitive navigation flow
   - Keyboard shortcuts
   - Accessibility compliance

Include proper route guards and permission checks throughout.
```

### Prompt 5.2: Club Management Interface
```
Create comprehensive club management:

1. Club List Component:
   - Material table with sorting and pagination
   - Columns: logo, name, league, city, status, actions
   - Search and filter functionality
   - Bulk operations (activate/deactivate)
   - Export to CSV option

2. Club Form Component:
   - Reactive forms with comprehensive validation
   - All club fields with proper input types
   - League dropdown with search
   - Position picker (interactive mini-map)
   - Logo upload with drag & drop
   - Rich text editor for description

3. Club Details Component:
   - Read-only view with all club information
   - Connections table for this club
   - Activity history
   - Quick edit actions

4. Logo Management:
   - Drag & drop upload area
   - Image preview and cropping
   - SVG validation and optimization
   - Automatic file naming
   - Gallery view of all logos

5. Data Validation:
   - Client-side validation with error messages
   - Server-side validation integration
   - Real-time validation feedback
   - Business rule enforcement

Include proper error handling and user feedback throughout.
```

### Prompt 5.3: Connection Management Interface
```
Create connection management system:

1. Connection List Component:
   - Table with from/to clubs, type, strength
   - Visual indicators for connection types
   - Filter by clubs, type, status
   - Bulk operations (activate/deactivate multiple)
   - Connection preview in mini graph

2. Connection Form Component:
   - From club autocomplete (searchable dropdown)
   - To club autocomplete (exclude selected from club)
   - Connection type selection with visual indicators
   - Strength slider with labels
   - Description rich text editor
   - Start/end date pickers
   - Evidence URL inputs (multiple)

3. Connection Validation:
   - No duplicate connections check
   - No self-connections validation
   - Bidirectional relationship handling
   - Business rule enforcement

4. Visual Preview:
   - Mini graph showing proposed connection
   - Before/after comparison
   - Impact analysis on network
   - Connection strength visualization

5. Bulk Operations:
   - Multi-select connections
   - Bulk status changes
   - Bulk type modifications
   - Export selected connections

Include comprehensive validation and real-time feedback.
```

### Prompt 5.4: File Management & Upload System
```
Create file management system:

1. File Upload Component:
   - Drag & drop interface
   - Multiple file selection
   - Progress indicators
   - File validation (type, size)
   - Error handling with retry options

2. File Gallery:
   - Grid view of uploaded files
   - Filter by type, club, date
   - Preview functionality
   - Bulk operations (delete, organize)
   - Usage tracking (which clubs use which logos)

3. Logo Management:
   - Club logo assignment interface
   - Replace logo functionality
   - Logo optimization tools
   - Automatic resizing
   - Format conversion (if needed)

4. File System Integration:
   - Secure file upload to backend
   - Automatic file organization
   - Cleanup of unused files
   - File integrity checking

5. Storage Management:
   - Storage usage statistics
   - File size optimization
   - Cleanup utilities
   - Backup procedures

Include security validation and proper file handling.
```

## Phase 6: Testing & Quality Assurance

### Prompt 6.1: Backend Testing Suite
```
Create comprehensive backend testing:

1. Unit Tests:
   - Domain entity tests (validation, business rules)
   - Service tests with mocked dependencies
   - Repository tests with in-memory database
   - Controller tests with mocked services
   - Utility class tests (password hashing, JWT)

2. Integration Tests:
   - API endpoint testing with TestHost
   - Database integration with test containers
   - Authentication flow testing
   - File upload testing
   - Error handling validation

3. Test Infrastructure:
   - Test data builders and factories
   - Database seeding for tests
   - Test doubles and mocks
   - Test utilities and helpers

4. Performance Tests:
   - Load testing for graph data endpoints
   - Stress testing for file uploads
   - Memory usage monitoring
   - Response time validation

5. Security Tests:
   - Authentication/authorization testing
   - Input validation testing
   - SQL injection prevention
   - File upload security testing

Use xUnit, FluentAssertions, Moq, and Testcontainers.
```

### Prompt 6.2: Frontend Testing Suite
```
Create comprehensive frontend testing:

1. Unit Tests:
   - Component testing with Angular Testing Library
   - Service testing with HttpClientTestingModule
   - Pipe testing with test data
   - Guard testing with router mocks

2. Integration Tests:
   - Component integration with services
   - Form validation testing
   - Router navigation testing
   - HTTP interceptor testing

3. E2E Tests with Cypress:
   - User journeys (view graph, login, manage clubs)
   - Admin workflows (create/edit clubs and connections)
   - Error scenarios and recovery
   - Mobile responsive testing

4. Visual Testing:
   - Component snapshot testing
   - Visual regression testing
   - Cross-browser compatibility
   - Accessibility testing

5. Performance Testing:
   - Graph rendering performance
   - Bundle size analysis
   - Core Web Vitals monitoring
   - Memory leak detection

Include proper test data setup and teardown procedures.
```

### Prompt 6.3: API Contract & Documentation Testing
```
Create API testing and documentation:

1. OpenAPI Specification:
   - Complete API documentation
   - Request/response schemas
   - Authentication documentation
   - Error response documentation

2. Contract Testing:
   - Validate API responses match frontend expectations
   - Schema validation for all endpoints
   - Error response format consistency
   - API versioning strategy

3. Documentation Testing:
   - Swagger UI functionality
   - Example requests/responses
   - Interactive API testing
   - Code generation validation

4. Postman Collections:
   - Complete API collection
   - Environment configurations
   - Automated test scripts
   - Team collaboration setup

5. API Monitoring:
   - Health check endpoints
   - Performance monitoring
   - Error rate tracking
   - Usage analytics

Include comprehensive API documentation and testing procedures.
```

## Phase 7: Deployment & DevOps

### Prompt 7.1: Docker Configuration
```
Create production-ready Docker setup:

1. Backend Dockerfile:
   - Multi-stage build with SDK and runtime
   - .NET 8 runtime optimization
   - Security best practices
   - Health check configuration

2. Frontend Dockerfile:
   - Multi-stage build with Node.js and nginx
   - Angular production build optimization
   - nginx configuration for SPA routing
   - Security headers and compression

3. docker-compose.yml:
   - Development environment setup
   - Database service (PostgreSQL)
   - Network configuration
   - Volume mounting for development

4. docker-compose.prod.yml:
   - Production overrides
   - SSL/TLS configuration
   - Performance optimizations
   - Logging configuration

5. Container Optimization:
   - Image size optimization
   - Layer caching strategy
   - Security scanning
   - Runtime optimization

Include .dockerignore files and security considerations.
```

### Prompt 7.2: CI/CD Pipeline
```
Create GitHub Actions CI/CD pipeline:

1. Build Pipeline:
   - .NET build and test
   - Angular build and test
   - Docker image building
   - Security scanning

2. Test Pipeline:
   - Unit test execution
   - Integration test execution
   - E2E test execution
   - Code coverage reporting

3. Deployment Pipeline:
   - Environment-specific deployments
   - Database migration handling
   - Blue-green deployment strategy
   - Rollback procedures

4. Quality Gates:
   - Code quality checks
   - Security vulnerability scanning
   - Performance regression testing
   - Documentation validation

5. Monitoring Integration:
   - Deployment notifications
   - Health check validation
   - Performance monitoring
   - Error tracking setup

Include proper secret management and environment configuration.
```

### Prompt 7.3: Production Configuration
```
Configure production environment:

1. Environment Management:
   - Production appsettings configuration
   - Environment variable management
   - Secret management (Azure Key Vault, etc.)
   - Feature flag configuration

2. Security Configuration:
   - HTTPS enforcement
   - Security headers
   - CORS configuration
   - Rate limiting

3. Performance Optimization:
   - Response caching
   - Database connection pooling
   - Static file optimization
   - CDN configuration

4. Monitoring & Logging:
   - Application Insights or similar
   - Structured logging with Serilog
   - Performance monitoring
   - Error tracking and alerting

5. Backup & Recovery:
   - Database backup strategy
   - File storage backup
   - Disaster recovery procedures
   - Data retention policies

Include comprehensive monitoring and alerting setup.
```

## Implementation Notes & Recommendations

### Technology Stack Alignment
- **Backend**: ASP.NET Core 8.0 with Clean Architecture
- **Frontend**: Angular 17+ with standalone components
- **Database**: PostgreSQL with Entity Framework Core
- **Authentication**: JWT with role-based authorization
- **Testing**: xUnit, Jasmine/Karma, Cypress
- **DevOps**: Docker, GitHub Actions, Azure/AWS

### Key Differences from Implementation Guide
1. **Database**: Using PostgreSQL instead of JSON files for production scalability
2. **Architecture**: Implementing Clean Architecture with CQRS (manual, no MediatR)
3. **Frontend**: Using Angular 17+ standalone components instead of traditional modules
4. **State Management**: Using Angular 17 signals instead of traditional observables
5. **Testing**: Comprehensive testing strategy including E2E with Cypress

### Development Priorities
1. **Phase 1-2**: Core backend functionality and authentication
2. **Phase 3-4**: Frontend foundation and graph visualization
3. **Phase 5**: Admin panel and management features
4. **Phase 6**: Testing and quality assurance
5. **Phase 7**: Deployment and production readiness

Each prompt should be executed in sequence, with proper testing and validation before moving to the next phase. The implementation should follow .NET coding standards and Angular best practices throughout.
