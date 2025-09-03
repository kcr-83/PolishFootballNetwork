# Polish Football Network - Przewodnik implementacji dla GitHub Copilot

**Autor:** Łukasz Rojek  
**Data utworzenia:** 2025-09-02  
**Opis:** Instrukcje krok po kroku do stworzenia interaktywnej mapy połączeń polskich klubów piłkarskich z panelem administracyjnym.

---

## 📋 KROK 1: Inicjalizacja projektu i struktura

### Prompt 1.1: Utworzenie struktury głównej
```
Stwórz strukturę folderów dla projektu Polish Football Network:
- frontend/ (Angular SPA)
- backend/ (ASP.NET Core Web API) 
- data/ (pliki JSON)
- docs/ (dokumentacja)
- docker-compose.yml
- README.md

W README.md opisz cel projektu: interaktywna mapa połączeń kibicowskich polskich klubów piłkarskich z możliwością administrowania przez panel admin.
```

### Prompt 1.2: Backend - ASP.NET Core Web API
```
Stwórz nowy projekt ASP.NET Core Web API w folderze backend/ o nazwie PolishFootballNetwork.API z następującą strukturą:
- Controllers/ (AuthController, ClubsController, ConnectionsController, AdminController)
- Models/ (DTOs, Entities, Responses)
- Services/ (ClubService, ConnectionService, AuthService, FileService)
- Data/ (Repositories, JsonData)
- Middleware/ (ExceptionHandlingMiddleware, RequestLoggingMiddleware)
- Configuration/ (JwtSettings, FileSettings, CorsSettings)
- Utilities/ (PasswordHasher, JwtTokenGenerator, FileValidator)

Dodaj NuGet packages:
- Microsoft.AspNetCore.Authentication.JwtBearer
- Microsoft.AspNetCore.Cors
- Swashbuckle.AspNetCore
- Serilog.AspNetCore
- AutoMapper
- FluentValidation.AspNetCore
```

### Prompt 1.3: Frontend - Angular SPA
```
Stwórz nowy projekt Angular 17+ w folderze frontend/ o nazwie polish-football-network-ui z następującą strukturą:
- src/app/core/ (guards, interceptors, services)
- src/app/shared/ (components, models, pipes)
- src/app/features/ (graph-viewer, admin-panel, auth)
- src/app/layout/ (header, navigation, footer)
- src/assets/club-logos/ (foldery: ekstraklasa/, fortuna-1-liga/, european/)

Dodaj dependencies:
- @angular/material
- cytoscape
- @types/cytoscape
- rxjs

Skonfiguruj Angular Material z niestandardowym motywem w kolorach polskich klubów.
```

---

## 📊 KROK 2: Modele danych i struktury JSON

### Prompt 2.1: Modele Entity (Backend)
```
Stwórz modele Entity w folderze Models/Entities/:

1. Club.cs - zawiera:
   - Id (string), Name (string), ShortName (string)
   - League (enum: Ekstraklasa, Fortuna1Liga, European)
   - Country (string), City (string)
   - LogoPath (string), Position (Point2D)
   - Founded (int), Stadium (string), Website (string)
   - IsActive (bool), CreatedAt, UpdatedAt

2. Connection.cs - zawiera:
   - Id (string), FromClubId, ToClubId
   - Type (enum: Alliance, Rivalry, Friendship)
   - Strength (enum: Weak, Medium, Strong)
   - Description, StartDate, IsActive, IsOfficial
   - CreatedAt, UpdatedAt

3. User.cs - zawiera:
   - Id, Username, PasswordHash, Role (enum: Admin)
   - CreatedAt, LastLoginAt

Dodaj Point2D jako pomocniczą strukturę dla pozycji X,Y na mapie.
```

### Prompt 2.2: DTOs (Backend)
```
Stwórz DTOs w folderze Models/DTOs/:

1. ClubDto.cs - publiczny DTO dla klubu (wszystkie pola z Club)
2. CreateClubDto.cs - DTO do tworzenia klubu (bez Id, CreatedAt, UpdatedAt)
3. UpdateClubDto.cs - DTO do aktualizacji klubu
4. ConnectionDto.cs - publiczny DTO dla połączenia
5. CreateConnectionDto.cs - DTO do tworzenia połączenia
6. UpdateConnectionDto.cs - DTO do aktualizacji połączenia
7. LoginDto.cs - Username, Password
8. GraphDataDto.cs - kompleksowy DTO zawierający clubs[] i connections[] dla frontu

Skonfiguruj AutoMapper profile do mapowania Entity <-> DTO.
```

### Prompt 2.3: Modele TypeScript (Frontend)
```
Stwórz modele TypeScript w folderze src/app/shared/models/:

1. club.model.ts - interface Club odpowiadający ClubDto z backendu
2. connection.model.ts - interface Connection 
3. graph-data.model.ts - interface GraphData zawierający clubs[] i connections[]
4. api-response.model.ts - generyczny interface ApiResponse<T>
5. position.model.ts - interface Point2D dla pozycji X,Y
6. enums.model.ts - eksport enumów League, ConnectionType, ConnectionStrength

Wszystkie interfejsy powinny być exported i odpowiadać strukturze DTOs z backendu.
```

### Prompt 2.4: Początkowe dane JSON
```
Stwórz pliki JSON w folderze backend/Data/JsonData/:

1. clubs.json - zawierający 10 przykładowych polskich klubów:
   - Legia Warszawa, Lech Poznań, Wisła Kraków, Cracovia, Śląsk Wrocław
   - Górnik Zabrze, Pogoń Szczecin, Jagiellonia Białystok, Piast Gliwice, Raków Częstochowa
   Każdy klub z wszystkimi wymaganymi polami i losowymi pozycjami na mapie.

2. connections.json - zawierający 5 przykładowych połączeń między klubami:
   - Legia-Lazio (alliance), Wisła-Cracovia (rivalry), Lech-Dynamo Dresden (friendship)
   Include connectionTypes array z definicjami kolorów dla każdego typu.

3. users.json - zawierający jednego admin usera:
   - Username: "admin", zahashowane hasło: "admin123", Role: "Admin"

Użyj realistic danych z prawdziwymi nazwami, stadionami, datami założenia klubów.
```

---

## 🔧 KROK 3: Backend - Services i Repositories

### Prompt 3.1: Repository pattern
```
Stwórz interfejsy repository w Data/Repositories/Interfaces/:

1. IClubRepository.cs z metodami:
   - GetAllAsync(), GetByIdAsync(string id)
   - CreateAsync(Club club), UpdateAsync(Club club), DeleteAsync(string id)
   - ExistsAsync(string id)

2. IConnectionRepository.cs z podobnymi metodami dla Connection
   - Dodatkowo: GetByClubIdAsync(string clubId)

Zaimplementuj JsonClubRepository.cs i JsonConnectionRepository.cs które:
- Odczytują dane z plików JSON
- Implementują CRUD operacje z zapisem do plików
- Używają thread-safe operacji na plikach
- Mają proper error handling i logging
```

### Prompt 3.2: Business Services
```
Stwórz interfejsy w Services/Interfaces/ i implementacje:

1. IClubService.cs i ClubService.cs:
   - GetAllClubsAsync(), GetClubByIdAsync()
   - CreateClubAsync(CreateClubDto), UpdateClubAsync(string id, UpdateClubDto)
   - DeleteClubAsync(string id), ValidateClubPositionAsync()

2. IConnectionService.cs i ConnectionService.cs:
   - GetAllConnectionsAsync(), GetConnectionsByClubAsync()
   - CreateConnectionAsync(), UpdateConnectionAsync(), DeleteConnectionAsync()
   - ValidateConnectionAsync() - sprawdza czy kluby istnieją

3. IAuthService.cs i AuthService.cs:
   - LoginAsync(LoginDto), GenerateTokenAsync(User)
   - ValidateTokenAsync(string token)

4. IFileService.cs i FileService.cs:
   - UploadLogoAsync(IFormFile, string clubId)
   - DeleteLogoAsync(string clubId), ValidateImageFileAsync()

Wszystkie serwisy powinny używać AutoMapper i proper exception handling.
```

### Prompt 3.3: Configuration i Utilities
```
Stwórz klasy konfiguracyjne w Configuration/:

1. JwtSettings.cs - SecretKey, Issuer, Audience, ExpirationInHours
2. FileSettings.cs - LogoUploadPath, AllowedExtensions, MaxFileSizeInMB  
3. CorsSettings.cs - AllowedOrigins, AllowedMethods, AllowedHeaders

Stwórz utilities w Utilities/:

1. PasswordHasher.cs - HashPassword(), VerifyPassword() używając BCrypt
2. JwtTokenGenerator.cs - GenerateToken(User user, JwtSettings settings)
3. FileValidator.cs - IsValidImageFile(), GetSafeFileName()

Skonfiguruj wszystkie w Program.cs z proper dependency injection.
```

---

## 🌐 KROK 4: Backend - Controllers i API

### Prompt 4.1: AuthController
```
Stwórz AuthController.cs z endpointami:

[POST] /api/auth/login
- Przyjmuje LoginDto
- Zwraca JWT token i user info
- Proper validation i error handling
- Rate limiting protection

[POST] /api/auth/validate
- Przyjmuje token w header Authorization
- Zwraca czy token jest valid
- Używane przez frontend do sprawdzenia sesji

Dodaj Authorize attribute i proper HTTP status codes.
```

### Prompt 4.2: ClubsController (publiczny)
```
Stwórz ClubsController.cs z publicznymi endpointami:

[GET] /api/clubs
- Zwraca wszystkie aktywne kluby
- Optional query params: league, country
- Paginacja z skip/take parameters
- Response w formacie ApiResponse<List<ClubDto>>

[GET] /api/clubs/{id}
- Zwraca szczegóły konkretnego klubu
- 404 jeśli nie istnieje lub nieaktywny
- Include connections dla tego klubu

[GET] /api/graph-data  
- Zwraca kompletne dane dla frontu: GraphDataDto
- Zawiera wszystkie kluby i połączenia
- Cached response (5 minut)

Dodaj proper error handling, logging i Swagger documentation.
```

### Prompt 4.3: AdminController (zabezpieczony)
```
Stwórz AdminController.cs z [Authorize] attribute:

Kluby:
[POST] /api/admin/clubs - CreateClubAsync()
[PUT] /api/admin/clubs/{id} - UpdateClubAsync() 
[DELETE] /api/admin/clubs/{id} - DeleteClubAsync()

Połączenia:
[POST] /api/admin/connections - CreateConnectionAsync()
[PUT] /api/admin/connections/{id} - UpdateConnectionAsync()
[DELETE] /api/admin/connections/{id} - DeleteConnectionAsync()

Upload:
[POST] /api/admin/upload-logo/{clubId} - UploadLogoAsync()
- Multipart/form-data file upload
- Validation: SVG only, max 1MB
- Automatic file naming i path assignment

Wszystkie endpointy z proper validation, authorization i audit logging.
```

### Prompt 4.4: Middleware i Program.cs
```
Stwórz middleware w Middleware/:

1. ExceptionHandlingMiddleware.cs:
   - Global exception handling
   - Proper HTTP status codes mapping
   - Structured logging z Serilog
   - Development vs Production error details

2. RequestLoggingMiddleware.cs:
   - Log wszystkie requests z timing
   - Include user context (jeśli zalogowany)
   - Exclude sensitive data (passwords, tokens)

Skonfiguruj Program.cs z:
- JWT Authentication
- CORS policy
- Swagger z JWT support
- Serilog configuration
- AutoMapper registration
- All services w DI container
- Middleware pipeline w proper order
```

---

## 🎨 KROK 5: Frontend - Core i Shared

### Prompt 5.1: Core Services
```
Stwórz serwisy w src/app/core/services/:

1. api.service.ts:
   - HttpClient wrapper z base URL
   - Generic GET, POST, PUT, DELETE methods
   - Error handling z proper typing
   - Loading state management

2. auth.service.ts:
   - login(), logout(), isAuthenticated()
   - Token storage w localStorage
   - Auto token refresh logic
   - Current user state management

3. notification.service.ts:
   - Success/error/warning notifications
   - Using Angular Material SnackBar
   - Queue system dla multiple notifications

Użyj Angular 17 inject() function i standalone components approach.
```

### Prompt 5.2: HTTP Interceptors i Guards
```
Stwórz w src/app/core/:

1. interceptors/auth.interceptor.ts:
   - Automatyczne dodawanie JWT token do headers
   - Handle 401 responses z auto logout
   - Loading state management
   - Error response transformation

2. guards/admin.guard.ts:
   - Sprawdza czy user jest zalogowany jako admin
   - Redirect do login page jeśli nie
   - Using Angular 17 functional guards

3. guards/auth.guard.ts:
   - Basic authentication check
   - Route protection

Skonfiguruj wszystko w app.config.ts z proper providers.
```

### Prompt 5.3: Shared Components
```
Stwórz shared components w src/app/shared/components/:

1. loading-spinner/loading-spinner.component.ts:
   - Angular Material spinner
   - Configurable size i color
   - Overlay option dla full-screen loading

2. confirmation-dialog/confirmation-dialog.component.ts:
   - Material Dialog do potwierdzania akcji
   - Configurable title, message, buttons
   - Generic typing dla response

3. error-display/error-display.component.ts:
   - Display error messages z proper styling
   - Different severity levels
   - Retry button option

Wszystkie jako standalone components z proper exports.
```

### Prompt 5.4: Pipes i Utilities
```
Stwórz w src/app/shared/:

1. pipes/club-filter.pipe.ts:
   - Filter klubów po nazwie, lidze, kraju
   - Case-insensitive search
   - Multiple criteria support

2. pipes/connection-type.pipe.ts:
   - Transform connection type enum do display text
   - Polish translations: Alliance->Sojusz, Rivalry->Rywalizacja

3. utilities/constants.ts:
   - API endpoints constants
   - Configuration values
   - Enum mappings

4. utilities/validators.ts:
   - Custom form validators
   - Club name validation, position validation
   - URL validation dla website links

Export wszystko przez shared.module.ts lub index.ts files.
```

---

## 🗺️ KROK 6: Frontend - Graph Viewer (główny komponent)

### Prompt 6.1: Graph Viewer Service
```
Stwórz src/app/features/graph-viewer/graph-viewer.service.ts:

1. GraphViewerService z metodami:
   - loadGraphData(): Observable<GraphData>
   - initializeGraph(container, data): cytoscape instance
   - updateNodePosition(nodeId, position): void
   - highlightPath(fromId, toId): void
   - resetHighlights(): void
   - exportGraphAsImage(): void

2. Graph configuration:
   - Node styles dla różnych lig (różne kolory)
   - Edge styles dla różnych typów połączeń
   - Layout algorithm (preset positions from JSON)
   - Zoom i pan controls
   - Node click handlers

3. Event handling:
   - Node selection events
   - Edge hover events  
   - Graph manipulation events
   - Export functionality

Użyj Cytoscape.js z TypeScript typings.
```

### Prompt 6.2: Graph Viewer Component
```
Stwórz src/app/features/graph-viewer/graph-viewer.component.ts:

1. Component z features:
   - Cytoscape graph container
   - Loading state podczas ładowania danych
   - Error handling z user-friendly messages
   - Toolbar z controls: zoom in/out, fit, reset, export
   - Search box do wyszukiwania klubów
   - Legend pokazujący typy połączeń i ligi

2. Template (HTML):
   - Graph container div z proper sizing
   - Floating toolbar z Material buttons
   - Search input z autocomplete
   - Legend panel (collapsible)
   - Loading spinner overlay
   - Error display component

3. Styles (SCSS):
   - Responsive design
   - Graph container full viewport minus header
   - Floating elements z proper z-index
   - Polish football theme colors

Component powinien być standalone i importować potrzebne Material modules.
```

### Prompt 6.3: Graph Styling i Configuration
```
Stwórz graph-config.ts w folderze graph-viewer/:

1. Cytoscape style configuration:
   - Node styles:
     * Ekstraklasa: większe nodes, złoty border
     * 1 Liga: średnie nodes, srebrny border  
     * European: czerwony border
     * Logo jako background image
   
2. Edge styles:
   - Alliance: zielona linia, solid
   - Rivalry: czerwona linia, dashed
   - Friendship: niebieska linia, dotted
   - Thickness based on strength

3. Layout options:
   - Preset positions z JSON data
   - Fallback do grid layout
   - Animation settings

4. Interaction settings:
   - Zoom limits (0.1 - 3.0)
   - Pan boundaries
   - Selection behavior
   - Hover effects

Export jako GraphConfig constant z proper TypeScript typing.
```

### Prompt 6.4: Search i Filter Functionality
```
Dodaj do graph-viewer.component.ts:

1. Search functionality:
   - Real-time search w club names
   - Highlight matching nodes
   - Auto-center na znaleziony klub
   - Search history (ostatnie 5 wyszukiwań)

2. Filter controls:
   - Checkboxes dla każdej ligi
   - Connection type filters
   - Country filters
   - Show/hide isolated nodes

3. Node information panel:
   - Click na node pokazuje side panel
   - Club details: nazwa, liga, stadium, rok założenia
   - Lista connections dla tego klubu
   - Link do official website

4. Export functionality:
   - PNG export całego grafu
   - SVG export dla vector graphics
   - JSON export aktualnego layout (positions)

Użyj Angular Material components i proper reactive forms.
```

---

## 🔐 KROK 7: Frontend - Authentication

### Prompt 7.1: Login Component
```
Stwórz src/app/features/auth/login/login.component.ts:

1. Reactive form z validation:
   - Username field (required, min 3 chars)
   - Password field (required, min 6 chars)
   - "Remember me" checkbox
   - Submit button z loading state

2. Component logic:
   - Form submission z AuthService.login()
   - Error handling z user feedback
   - Success redirect do admin panel
   - Auto-fill podczas development

3. Template z Angular Material:
   - mat-card z login form
   - mat-form-field dla inputs
   - mat-button dla submit
   - Error messages pod każdym field
   - Polish labels i placeholders

4. Styles:
   - Centered login card
   - Polish football colors theme
   - Responsive design
   - Loading spinner na button

Component standalone z proper imports i routing configuration.
```

### Prompt 7.2: Auth State Management
```
Rozszerz auth.service.ts o:

1. State management:
   - BehaviorSubject dla current user
   - isAuthenticated$ observable
   - userRole$ observable  
   - Auto token validation on app start

2. Local storage handling:
   - Secure token storage
   - Remember me functionality
   - Auto logout on token expiry
   - Clear storage on manual logout

3. HTTP error handling:
   - 401 interceptor z auto logout
   - Token refresh logic (jeśli backend supportuje)
   - Network error handling

4. Security features:
   - Token expiry checking
   - Automatic session cleanup
   - CSRF protection jeśli potrzebne

Integrate z router przez guards i update app initialization.
```

---

## ⚙️ KROK 8: Frontend - Admin Panel

### Prompt 8.1: Admin Layout i Navigation
```
Stwórz src/app/features/admin-panel/:

1. admin-panel.component.ts:
   - Router outlet dla admin routes
   - Side navigation z menu items:
     * Dashboard, Clubs Management, Connections Management
   - Top toolbar z user info i logout
   - Breadcrumb navigation

2. admin-routing.module.ts z routes:
   - /admin/dashboard
   - /admin/clubs (list, create, edit/:id)
   - /admin/connections (list, create, edit/:id)
   - Guards na wszystkich routes

3. Template z Angular Material:
   - mat-sidenav-container z responsive behavior
   - mat-toolbar z app title i user menu
   - mat-nav-list w sidenav
   - Content area z router-outlet

4. Admin dashboard component:
   - Statistics cards: total clubs, connections, recent activity
   - Quick actions buttons
   - Recent changes table
   - Charts jeśli potrzebne (Chart.js integration)

Wszystko protected przez AdminGuard.
```

### Prompt 8.2: Club Management
```
Stwórz club management w src/app/features/admin-panel/club-management/:

1. club-list.component.ts:
   - Material table z columns: logo, name, league, city, actions
   - Sorting, filtering, pagination
   - Search box
   - Add new club button
   - Edit/Delete actions w każdym row

2. club-form.component.ts:
   - Reactive form dla create/edit club
   - All club fields z proper validation
   - Logo upload functionality
   - Position picker (click on mini map?)
   - League, country dropdowns
   - Foundation year number input

3. club-details.component.ts:
   - Read-only view club details
   - Show connections dla tego klubu
   - Edit/Delete actions

4. Services integration:
   - ClubService do CRUD operations
   - FileService do logo upload
   - Proper error handling z user notifications
   - Optimistic updates w UI

Material table z proper data source i wszystkie Material form controls.
```

### Prompt 8.3: Connection Management  
```
Stwórz connection management w podobnej strukturze:

1. connection-list.component.ts:
   - Table z columns: from club, to club, type, strength, active
   - Filter po club, type, activity status
   - Visual indicators dla connection types
   - Bulk actions (activate/deactivate)

2. connection-form.component.ts:
   - From club dropdown (searchable)
   - To club dropdown (exclude selected from club)
   - Connection type radio buttons z color indicators
   - Strength slider
   - Description textarea
   - Start date picker
   - Active checkbox

3. Connection validation:
   - No duplicate connections
   - No self-connections
   - Validate club existence
   - Business rules enforcement

4. Visual connection preview:
   - Mini graph showing proposed connection
   - Before/after comparison
   - Impact analysis (jeśli to ma sens)

Wszystko z proper form validation i user experience.
```

### Prompt 8.4: File Upload i Logo Management
```
Dodaj logo management functionality:

1. Logo upload component:
   - Drag & drop area
   - File browser button
   - Preview uploaded image
   - Validation: SVG only, max size
   - Progress bar podczas upload

2. Logo gallery:
   - Grid view existing logos
   - Search/filter by club name
   - Replace logo functionality
   - Delete unused logos

3. Integration z club form:
   - Logo picker w club creation/edit
   - Automatic logo assignment
   - Fallback default logo

4. Backend integration:
   - FileService.uploadLogo()
   - Error handling dla failed uploads
   - Automatic file naming
   - Path updates w club entity

Use Angular Material file input i proper file handling security.
```

---

## 🎨 KROK 9: Styling i UI Polish

### Prompt 9.1: Material Theme i Polish Design
```
Stwórz custom Material theme w src/styles/:

1. _variables.scss:
   - Polish colors: biało-czerwony accent
   - Football green dla primary
   - Gray scale dla backgrounds
   - Semantic colors (success, warning, error)

2. _mixins.scss:
   - Responsive breakpoints
   - Common animations
   - Box shadows i elevations
   - Typography helpers

3. Component themes:
   - Graph viewer dark/light mode toggle
   - Admin panel professional look
   - Auth components clean design
   - Consistent spacing i typography

4. Polish localization setup:
   - Date formats
   - Number formats  
   - Error messages w polski
   - Form labels i placeholders

Configure Angular Material theming z custom palette.
```

### Prompt 9.2: Responsive Design i Mobile
```
Dodaj responsive behavior:

1. Graph viewer mobile adaptations:
   - Touch gestures dla zoom/pan
   - Mobile toolbar layout
   - Simplified legend dla small screens
   - Swipe gestures dla navigation

2. Admin panel mobile:
   - Collapsible sidenav
   - Stacked form layouts
   - Touch-friendly buttons i inputs
   - Mobile-optimized tables

3. General responsive patterns:
   - Breakpoint-based layouts
   - Flexible grid systems
   - Scalable typography
   - Adaptive navigation

4. Touch interactions:
   - Proper touch targets (44px minimum)
   - Swipe gestures where appropriate
   - Touch feedback animations
   - Scroll behavior optimization

Test na różnych device sizes i orientations.
```

### Prompt 9.3: Animations i Micro-interactions
```
Dodaj animations dla better UX:

1. Graph animations:
   - Node hover effects
   - Connection highlight animations
   - Smooth zoom/pan transitions
   - Loading state animations

2. Admin panel animations:
   - Page transitions
   - Form validation feedback
   - Success/error state changes
   - List item interactions

3. Global animations:
   - Route transition animations
   - Modal/dialog animations
   - Notification slide-ins
   - Loading spinners

4. Performance considerations:
   - Use CSS transforms dla better performance
   - Reduce animations na low-end devices
   - Respect user's motion preferences
   - Optimize animation duration i easing

Use Angular Animations API i CSS transitions.
```

---

## 🧪 KROK 10: Testing i Quality Assurance

### Prompt 10.1: Backend Unit Tests
```
Stwórz unit tests w PolishFootballNetwork.Tests/:

1. Service tests:
   - ClubService.Tests.cs - test all CRUD operations
   - ConnectionService.Tests.cs - test validation logic
   - AuthService.Tests.cs - test login/token generation
   - FileService.Tests.cs - test upload validation

2. Repository tests:
   - JsonClubRepository.Tests.cs - test file operations
   - JsonConnectionRepository.Tests.cs - test data consistency
   - Mock file system dla testów

3. Controller tests:
   - Test all endpoints
   - Test authentication/authorization
   - Test error handling
   - Test input validation

4. Utilities tests:
   - PasswordHasher tests
   - JwtTokenGenerator tests
   - FileValidator tests

Use xUnit, Moq, FluentAssertions. Include test data setup i cleanup.
```

### Prompt 10.2: Frontend Unit Tests
```
Stwórz frontend tests z Jasmine/Karma:

1. Service tests:
   - api.service.spec.ts - HTTP calls mocking
   - auth.service.spec.ts - token handling
   - graph-viewer.service.spec.ts - Cytoscape integration

2. Component tests:
   - graph-viewer.component.spec.ts - rendering i interactions
   - club-form.component.spec.ts - form validation
   - login.component.spec.ts - authentication flow

3. Guard tests:
   - admin.guard.spec.ts - authorization logic
   - auth.guard.spec.ts - authentication checks

4. Pipe tests:
   - club-filter.pipe.spec.ts - filtering logic
   - connection-type.pipe.spec.ts - enum transformations

Use Angular Testing utilities, MockHttpClient, jasmine spies.
```

### Prompt 10.3: Integration Tests
```
Stwórz integration tests:

1. Backend integration tests:
   - Full API endpoint testing
   - Database/file system integration
   - Authentication flow testing
   - File upload testing

2. Frontend E2E tests z Cypress:
   - User journey: view graph -> login -> manage clubs
   - Admin workflows: create club, add connection
   - Error scenarios: network failures, invalid data
   - Mobile responsive testing

3. API contract testing:
   - Validate API responses match frontend expectations
   - Schema validation dla JSON responses
   - Error response format consistency

4. Performance testing:
   - Graph rendering z large datasets
   - API response times
   - File upload performance

Setup test environments i CI/CD integration.
```

---

## 🚀 KROK 11: Deployment i Production

### Prompt 11.1: Docker Configuration
```
Stwórz Docker setup:

1. frontend/Dockerfile:
   - Multi-stage build z Node.js i nginx
   - Angular production build
   - Optimized nginx configuration
   - Static file serving

2. backend/Dockerfile:
   - .NET 8 runtime
   - Copy published application
   - Expose port 80
   - Health check endpoint

3. docker-compose.yml:
   - Frontend service na port 4200
   - Backend service na port 5000
   - Volume mounting dla data/ folder
   - Network configuration
   - Environment variables

4. docker-compose.prod.yml:
   - Production overrides
   - SSL configuration
   - Performance optimizations
   - Logging configuration

Include .dockerignore files dla optimization.
```

### Prompt 11.2: Environment Configuration
```
Setup environment management:

1. Backend environments:
   - appsettings.Development.json
   - appsettings.Production.json
   - Environment-specific JWT secrets
   - File upload paths configuration
   - CORS settings per environment

2. Frontend environments:
   - environment.ts (development)
   - environment.prod.ts (production)
   - API base URLs
   - Feature flags
   - Analytics configuration

3. CI/CD configuration:
   - GitHub Actions workflow
   - Build i test stages
   - Docker image building
   - Deployment automation

4. Security considerations:
   - Secret management
   - HTTPS enforcement
   - Security headers
   - Rate limiting configuration

Setup dla different deployment targets (dev, staging, prod).
```

### Prompt 11.3: Performance Optimization
```
Optimize application performance:

1. Frontend optimizations:
   - Angular build optimization flags
   - Lazy loading modules
   - OnPush change detection strategy
   - Service worker dla caching
   - Bundle analysis i tree shaking

2. Backend optimizations:
   - Response caching
   - JSON serialization optimization
   - File compression
   - Database query optimization (jeśli dodamy DB later)

3. Asset optimization:
   - Image compression dla club logos
   - SVG optimization
   - CDN setup dla static assets
   - Gzip compression

4. Monitoring setup:
   - Application performance monitoring
   - Error tracking
   - User analytics
   - Server monitoring

Include performance benchmarks i testing.
```

### Prompt 11.4: Documentation i Maintenance
```
Stwórz comprehensive documentation:

1. README.md files:
   - Project overview i architecture
   - Setup instructions dla development
   - Deployment guide
   - Troubleshooting guide

2. API documentation:
   - Swagger/OpenAPI specification
   - Endpoint descriptions
   - Authentication guide
   - Error codes reference

3. User documentation:
   - Admin panel user guide
   - Graph viewer help
   - FAQ section
   - Video tutorials (optional)

4. Developer documentation:
   - Code structure explanation
   - Adding new features guide
   - Database schema (jeśli dodamy)
   - Deployment procedures

5. Maintenance procedures:
   - Backup procedures dla JSON data
   - Update procedures
   - Monitoring i alerting setup
   - Security update process

Include przykłady, screenshots, i step-by-step instructions.
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (Tygodnie 1-2)
- [ ] Project structure setup
- [ ] Backend API foundation
- [ ] Frontend Angular setup
- [ ] Data models i DTOs
- [ ] Basic authentication

### Phase 2: Core Features (Tygodnie 3-4)
- [ ] Graph viewer implementation
- [ ] CRUD operations dla clubs
- [ ] CRUD operations dla connections
- [ ] File upload functionality
- [ ] Admin panel basic structure

### Phase 3: Polish i Enhancement (Tydzień 5)
- [ ] UI/UX improvements
- [ ] Responsive design
- [ ] Error handling
- [ ] Performance optimization
- [ ] Testing

### Phase 4: Deployment (Tydzień 6)
- [ ] Docker setup
- [ ] CI/CD pipeline
- [ ] Production deployment
- [ ] Documentation
- [ ] Monitoring setup

---

## 🎯 SUCCESS CRITERIA

1. **Functionality**: Pełne CRUD dla klubów i połączeń przez admin panel
2. **Usability**: Intuitive graph navigation z zoom/pan/search
3. **Security**: Proper authentication i authorization
4. **Performance**: Smooth rendering dla 100+ nodes
5. **Maintainability**: Clean code z proper documentation
6. **Deployment**: Automated deployment process

---

**Powodzenia w implementacji! 🚀⚽**