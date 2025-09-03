# Polish Football Network - Project Structure

**Project:** Interactive Map of Polish Football Club Fan Connections  
**Architecture:** Three-Tier Web Application (Frontend, Backend, Storage)  
**Technology Stack:** Angular + .NET Core WebAPI + PostgreSQL/JSON  
**Date:** September 3, 2025  
**Version:** 1.0

---

## 📋 OVERVIEW

This document defines the complete project structure for the Polish Football Network application, organized as a three-tier architecture with clear separation of concerns between presentation, business logic, and data layers.

---

## 🏗️ ROOT PROJECT STRUCTURE

```text
PolishFootballNetwork/
├── README.md
├── .gitignore
├── docker-compose.yml
├── docker-compose.override.yml
├── .env
├── .env.example
├── LICENSE
├── CHANGELOG.md
├── docs/
│   ├── api/
│   ├── architecture/
│   ├── deployment/
│   └── user-guides/
├── scripts/
│   ├── build.sh
│   ├── deploy.sh
│   ├── setup-dev.sh
│   └── database/
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   └── terraform/
├── src/
│   ├── frontend/          # Angular Application (Presentation Tier)
│   ├── backend/           # .NET Core WebAPI (Business Logic Tier)
│   └── database/          # Database Scripts & Migrations (Data Tier)
├── tests/
│   ├── frontend/
│   ├── backend/
│   └── integration/
└── tools/
    ├── data-seeders/
    ├── logo-processors/
    └── deployment/
```

---

## 🎨 FRONTEND (PRESENTATION TIER) - Angular Application

### Angular Application Structure

```text
src/frontend/
├── package.json
├── package-lock.json
├── angular.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── karma.conf.js
├── .eslintrc.json
├── .browserslistrc
├── .editorconfig
├── README.md
└── src/
    ├── main.ts
    ├── index.html
    ├── styles.scss
    ├── favicon.ico
    ├── assets/
    │   ├── images/
    │   │   ├── logos/
    │   │   │   ├── clubs/
    │   │   │   │   ├── ekstraklasa/
    │   │   │   │   ├── fortuna-1-liga/
    │   │   │   │   └── european/
    │   │   │   └── default-club.svg
    │   │   ├── icons/
    │   │   └── backgrounds/
    │   ├── data/
    │   │   ├── mock-clubs.json
    │   │   └── mock-connections.json
    │   ├── i18n/
    │   │   ├── en.json
    │   │   └── pl.json
    │   └── config/
    │       ├── environment.ts
    │       └── graph-config.ts
    ├── environments/
    │   ├── environment.ts
    │   ├── environment.development.ts
    │   ├── environment.staging.ts
    │   └── environment.production.ts
    └── app/
        ├── app.component.ts
        ├── app.component.html
        ├── app.component.scss
        ├── app.config.ts
        ├── app.routes.ts
        ├── core/
        │   ├── auth/
        │   │   ├── guards/
        │   │   │   ├── auth.guard.ts
        │   │   │   └── admin.guard.ts
        │   │   ├── interceptors/
        │   │   │   ├── auth.interceptor.ts
        │   │   │   ├── error.interceptor.ts
        │   │   │   └── loading.interceptor.ts
        │   │   └── services/
        │   │       ├── auth.service.ts
        │   │       ├── token.service.ts
        │   │       └── session.service.ts
        │   ├── services/
        │   │   ├── api.service.ts
        │   │   ├── notification.service.ts
        │   │   ├── loading.service.ts
        │   │   ├── theme.service.ts
        │   │   └── error-handler.service.ts
        │   ├── models/
        │   │   ├── api-response.model.ts
        │   │   ├── pagination.model.ts
        │   │   ├── error.model.ts
        │   │   └── user.model.ts
        │   └── constants/
        │       ├── api-endpoints.const.ts
        │       ├── app-config.const.ts
        │       └── error-messages.const.ts
        ├── shared/
        │   ├── components/
        │   │   ├── loading-spinner/
        │   │   │   ├── loading-spinner.component.ts
        │   │   │   ├── loading-spinner.component.html
        │   │   │   └── loading-spinner.component.scss
        │   │   ├── confirmation-dialog/
        │   │   │   ├── confirmation-dialog.component.ts
        │   │   │   ├── confirmation-dialog.component.html
        │   │   │   └── confirmation-dialog.component.scss
        │   │   ├── error-display/
        │   │   │   ├── error-display.component.ts
        │   │   │   ├── error-display.component.html
        │   │   │   └── error-display.component.scss
        │   │   ├── search-input/
        │   │   │   ├── search-input.component.ts
        │   │   │   ├── search-input.component.html
        │   │   │   └── search-input.component.scss
        │   │   └── file-upload/
        │   │       ├── file-upload.component.ts
        │   │       ├── file-upload.component.html
        │   │       └── file-upload.component.scss
        │   ├── models/
        │   │   ├── club.model.ts
        │   │   ├── connection.model.ts
        │   │   ├── graph-data.model.ts
        │   │   ├── position.model.ts
        │   │   └── enums.model.ts
        │   ├── services/
        │   │   ├── club.service.ts
        │   │   ├── connection.service.ts
        │   │   ├── file.service.ts
        │   │   └── graph-data.service.ts
        │   ├── pipes/
        │   │   ├── club-filter.pipe.ts
        │   │   ├── connection-type.pipe.ts
        │   │   ├── league-display.pipe.ts
        │   │   └── safe-html.pipe.ts
        │   ├── directives/
        │   │   ├── click-outside.directive.ts
        │   │   ├── drag-drop.directive.ts
        │   │   └── auto-focus.directive.ts
        │   ├── validators/
        │   │   ├── custom-validators.ts
        │   │   ├── club-validators.ts
        │   │   └── connection-validators.ts
        │   └── utilities/
        │       ├── constants.ts
        │       ├── helpers.ts
        │       ├── date-utils.ts
        │       └── file-utils.ts
        ├── features/
        │   ├── graph-viewer/
        │   │   ├── graph-viewer.component.ts
        │   │   ├── graph-viewer.component.html
        │   │   ├── graph-viewer.component.scss
        │   │   ├── services/
        │   │   │   ├── graph-viewer.service.ts
        │   │   │   ├── cytoscape.service.ts
        │   │   │   └── graph-export.service.ts
        │   │   ├── components/
        │   │   │   ├── graph-toolbar/
        │   │   │   ├── graph-legend/
        │   │   │   ├── club-info-panel/
        │   │   │   ├── graph-filters/
        │   │   │   └── graph-search/
        │   │   ├── models/
        │   │   │   ├── graph-config.model.ts
        │   │   │   ├── graph-events.model.ts
        │   │   │   └── export-options.model.ts
        │   │   └── utilities/
        │   │       ├── graph-config.ts
        │   │       ├── graph-styles.ts
        │   │       └── layout-algorithms.ts
        │   ├── auth/
        │   │   ├── login/
        │   │   │   ├── login.component.ts
        │   │   │   ├── login.component.html
        │   │   │   └── login.component.scss
        │   │   ├── logout/
        │   │   │   ├── logout.component.ts
        │   │   │   ├── logout.component.html
        │   │   │   └── logout.component.scss
        │   │   ├── models/
        │   │   │   ├── login-request.model.ts
        │   │   │   ├── auth-response.model.ts
        │   │   │   └── session.model.ts
        │   │   └── services/
        │   │       └── auth-api.service.ts
        │   └── admin-panel/
        │       ├── admin-panel.component.ts
        │       ├── admin-panel.component.html
        │       ├── admin-panel.component.scss
        │       ├── admin-routing.module.ts
        │       ├── dashboard/
        │       │   ├── dashboard.component.ts
        │       │   ├── dashboard.component.html
        │       │   ├── dashboard.component.scss
        │       │   └── components/
        │       │       ├── stats-cards/
        │       │       ├── recent-activity/
        │       │       └── quick-actions/
        │       ├── club-management/
        │       │   ├── club-list/
        │       │   │   ├── club-list.component.ts
        │       │   │   ├── club-list.component.html
        │       │   │   └── club-list.component.scss
        │       │   ├── club-form/
        │       │   │   ├── club-form.component.ts
        │       │   │   ├── club-form.component.html
        │       │   │   └── club-form.component.scss
        │       │   ├── club-details/
        │       │   │   ├── club-details.component.ts
        │       │   │   ├── club-details.component.html
        │       │   │   └── club-details.component.scss
        │       │   ├── logo-management/
        │       │   │   ├── logo-gallery.component.ts
        │       │   │   ├── logo-gallery.component.html
        │       │   │   ├── logo-gallery.component.scss
        │       │   │   ├── logo-upload.component.ts
        │       │   │   ├── logo-upload.component.html
        │       │   │   └── logo-upload.component.scss
        │       │   ├── models/
        │       │   │   ├── create-club-dto.model.ts
        │       │   │   ├── update-club-dto.model.ts
        │       │   │   └── club-form.model.ts
        │       │   └── services/
        │       │       ├── club-admin.service.ts
        │       │       └── logo-admin.service.ts
        │       ├── connection-management/
        │       │   ├── connection-list/
        │       │   │   ├── connection-list.component.ts
        │       │   │   ├── connection-list.component.html
        │       │   │   └── connection-list.component.scss
        │       │   ├── connection-form/
        │       │   │   ├── connection-form.component.ts
        │       │   │   ├── connection-form.component.html
        │       │   │   └── connection-form.component.scss
        │       │   ├── connection-details/
        │       │   │   ├── connection-details.component.ts
        │       │   │   ├── connection-details.component.html
        │       │   │   └── connection-details.component.scss
        │       │   ├── models/
        │       │   │   ├── create-connection-dto.model.ts
        │       │   │   ├── update-connection-dto.model.ts
        │       │   │   └── connection-form.model.ts
        │       │   └── services/
        │       │       └── connection-admin.service.ts
        │       ├── models/
        │       │   ├── admin-stats.model.ts
        │       │   ├── activity-log.model.ts
        │       │   └── admin-response.model.ts
        │       └── services/
        │           ├── admin-dashboard.service.ts
        │           └── activity-log.service.ts
        └── layout/
            ├── header/
            │   ├── header.component.ts
            │   ├── header.component.html
            │   └── header.component.scss
            ├── footer/
            │   ├── footer.component.ts
            │   ├── footer.component.html
            │   └── footer.component.scss
            ├── navigation/
            │   ├── main-nav.component.ts
            │   ├── main-nav.component.html
            │   ├── main-nav.component.scss
            │   ├── admin-nav.component.ts
            │   ├── admin-nav.component.html
            │   └── admin-nav.component.scss
            └── sidebar/
                ├── sidebar.component.ts
                ├── sidebar.component.html
                └── sidebar.component.scss
```

---

## ⚙️ BACKEND (BUSINESS LOGIC TIER) - .NET Core WebAPI

### .NET Core WebAPI Structure

```text
src/backend/
├── PolishFootballNetwork.sln
├── .editorconfig
├── .gitignore
├── Directory.Build.props
├── Directory.Packages.props
├── global.json
├── NuGet.config
├── README.md
├── build/
│   ├── docker/
│   │   ├── Dockerfile
│   │   ├── Dockerfile.development
│   │   └── .dockerignore
│   └── scripts/
│       ├── build.sh
│       ├── test.sh
│       └── publish.sh
└── src/
    ├── PolishFootballNetwork.Domain/
    │   ├── PolishFootballNetwork.Domain.csproj
    │   ├── Entities/
    │   │   ├── Club.cs
    │   │   ├── Connection.cs
    │   │   ├── User.cs
    │   │   └── Base/
    │   │       ├── BaseEntity.cs
    │   │       ├── IAuditable.cs
    │   │       └── ISoftDeletable.cs
    │   ├── ValueObjects/
    │   │   ├── Point2D.cs
    │   │   ├── Password.cs
    │   │   └── Website.cs
    │   ├── Enums/
    │   │   ├── League.cs
    │   │   ├── ConnectionType.cs
    │   │   ├── ConnectionStrength.cs
    │   │   └── UserRole.cs
    │   ├── Events/
    │   │   ├── ClubCreatedEvent.cs
    │   │   ├── ConnectionCreatedEvent.cs
    │   │   └── UserLoggedInEvent.cs
    │   ├── Exceptions/
    │   │   ├── DomainException.cs
    │   │   ├── ClubNotFoundException.cs
    │   │   ├── InvalidConnectionException.cs
    │   │   └── UnauthorizedException.cs
    │   ├── Interfaces/
    │   │   ├── Repositories/
    │   │   │   ├── IClubRepository.cs
    │   │   │   ├── IConnectionRepository.cs
    │   │   │   ├── IUserRepository.cs
    │   │   │   └── IUnitOfWork.cs
    │   │   └── Services/
    │   │       ├── IDomainEventDispatcher.cs
    │   │       └── IDateTimeProvider.cs
    │   └── Specifications/
    │       ├── ClubSpecifications.cs
    │       ├── ConnectionSpecifications.cs
    │       └── Base/
    │           ├── ISpecification.cs
    │           └── BaseSpecification.cs
    ├── PolishFootballNetwork.Application/
    │   ├── PolishFootballNetwork.Application.csproj
    │   ├── Commands/
    │   │   ├── Clubs/
    │   │   │   ├── CreateClub/
    │   │   │   │   ├── CreateClubCommand.cs
    │   │   │   │   ├── CreateClubCommandHandler.cs
    │   │   │   │   └── CreateClubCommandValidator.cs
    │   │   │   ├── UpdateClub/
    │   │   │   │   ├── UpdateClubCommand.cs
    │   │   │   │   ├── UpdateClubCommandHandler.cs
    │   │   │   │   └── UpdateClubCommandValidator.cs
    │   │   │   └── DeleteClub/
    │   │   │       ├── DeleteClubCommand.cs
    │   │   │       ├── DeleteClubCommandHandler.cs
    │   │   │       └── DeleteClubCommandValidator.cs
    │   │   ├── Connections/
    │   │   │   ├── CreateConnection/
    │   │   │   ├── UpdateConnection/
    │   │   │   └── DeleteConnection/
    │   │   ├── Auth/
    │   │   │   ├── Login/
    │   │   │   │   ├── LoginCommand.cs
    │   │   │   │   ├── LoginCommandHandler.cs
    │   │   │   │   └── LoginCommandValidator.cs
    │   │   │   └── RefreshToken/
    │   │   └── Files/
    │   │       ├── UploadLogo/
    │   │       │   ├── UploadLogoCommand.cs
    │   │       │   ├── UploadLogoCommandHandler.cs
    │   │       │   └── UploadLogoCommandValidator.cs
    │   │       └── DeleteLogo/
    │   ├── Queries/
    │   │   ├── Clubs/
    │   │   │   ├── GetClubs/
    │   │   │   │   ├── GetClubsQuery.cs
    │   │   │   │   └── GetClubsQueryHandler.cs
    │   │   │   ├── GetClubById/
    │   │   │   │   ├── GetClubByIdQuery.cs
    │   │   │   │   └── GetClubByIdQueryHandler.cs
    │   │   │   └── SearchClubs/
    │   │   ├── Connections/
    │   │   │   ├── GetConnections/
    │   │   │   ├── GetConnectionsByClub/
    │   │   │   └── GetConnectionById/
    │   │   ├── GraphData/
    │   │   │   ├── GetGraphData/
    │   │   │   │   ├── GetGraphDataQuery.cs
    │   │   │   │   └── GetGraphDataQueryHandler.cs
    │   │   │   └── GetFilteredGraphData/
    │   │   └── Admin/
    │   │       ├── GetDashboardStats/
    │   │       └── GetActivityLog/
    │   ├── DTOs/
    │   │   ├── Clubs/
    │   │   │   ├── ClubDto.cs
    │   │   │   ├── CreateClubDto.cs
    │   │   │   ├── UpdateClubDto.cs
    │   │   │   └── ClubSummaryDto.cs
    │   │   ├── Connections/
    │   │   │   ├── ConnectionDto.cs
    │   │   │   ├── CreateConnectionDto.cs
    │   │   │   └── UpdateConnectionDto.cs
    │   │   ├── Auth/
    │   │   │   ├── LoginDto.cs
    │   │   │   ├── AuthResponseDto.cs
    │   │   │   └── UserDto.cs
    │   │   ├── Graph/
    │   │   │   ├── GraphDataDto.cs
    │   │   │   ├── GraphNodeDto.cs
    │   │   │   └── GraphEdgeDto.cs
    │   │   ├── Files/
    │   │   │   ├── FileUploadDto.cs
    │   │   │   └── FileResponseDto.cs
    │   │   └── Common/
    │   │       ├── ApiResponse.cs
    │   │       ├── PagedResponse.cs
    │   │       ├── PaginationDto.cs
    │   │       └── ErrorDto.cs
    │   ├── Mappings/
    │   │   ├── ClubMappingProfile.cs
    │   │   ├── ConnectionMappingProfile.cs
    │   │   ├── UserMappingProfile.cs
    │   │   └── GraphDataMappingProfile.cs
    │   ├── Behaviors/
    │   │   ├── ValidationBehavior.cs
    │   │   ├── LoggingBehavior.cs
    │   │   ├── PerformanceBehavior.cs
    │   │   └── CachingBehavior.cs
    │   ├── Services/
    │   │   ├── Interfaces/
    │   │   │   ├── IAuthService.cs
    │   │   │   ├── IFileService.cs
    │   │   │   ├── IEmailService.cs
    │   │   │   ├── ICacheService.cs
    │   │   │   └── ICurrentUserService.cs
    │   │   └── Implementations/
    │   │       ├── AuthService.cs
    │   │       ├── FileService.cs
    │   │       ├── EmailService.cs
    │   │       ├── CacheService.cs
    │   │       └── CurrentUserService.cs
    │   ├── Interfaces/
    │   │   ├── IMediator.cs
    │   │   ├── IRequestHandler.cs
    │   │   ├── IRequest.cs
    │   │   └── ICommand.cs
    │   ├── Validation/
    │   │   ├── Common/
    │   │   │   ├── CommonValidators.cs
    │   │   │   └── ValidationExtensions.cs
    │   │   ├── Clubs/
    │   │   │   └── ClubValidators.cs
    │   │   └── Connections/
    │   │       └── ConnectionValidators.cs
    │   └── Extensions/
    │       ├── ServiceCollectionExtensions.cs
    │       ├── QueryableExtensions.cs
    │       └── EnumExtensions.cs
    ├── PolishFootballNetwork.Infrastructure/
    │   ├── PolishFootballNetwork.Infrastructure.csproj
    │   ├── Data/
    │   │   ├── JsonData/
    │   │   │   ├── clubs.json
    │   │   │   ├── connections.json
    │   │   │   ├── users.json
    │   │   │   └── configuration.json
    │   │   ├── Repositories/
    │   │   │   ├── Json/
    │   │   │   │   ├── JsonClubRepository.cs
    │   │   │   │   ├── JsonConnectionRepository.cs
    │   │   │   │   ├── JsonUserRepository.cs
    │   │   │   │   └── JsonUnitOfWork.cs
    │   │   │   ├── Database/
    │   │   │   │   ├── EfClubRepository.cs
    │   │   │   │   ├── EfConnectionRepository.cs
    │   │   │   │   ├── EfUserRepository.cs
    │   │   │   │   └── EfUnitOfWork.cs
    │   │   │   └── Base/
    │   │   │       ├── BaseRepository.cs
    │   │   │       └── RepositoryHelper.cs
    │   │   ├── Context/
    │   │   │   ├── PolishFootballNetworkDbContext.cs
    │   │   │   ├── DbContextFactory.cs
    │   │   │   └── ModelConfiguration/
    │   │   │       ├── ClubConfiguration.cs
    │   │   │       ├── ConnectionConfiguration.cs
    │   │   │       └── UserConfiguration.cs
    │   │   └── Migrations/
    │   │       └── (Auto-generated migration files)
    │   ├── Services/
    │   │   ├── Authentication/
    │   │   │   ├── JwtTokenGenerator.cs
    │   │   │   ├── PasswordHasher.cs
    │   │   │   └── TokenValidator.cs
    │   │   ├── Files/
    │   │   │   ├── LocalFileService.cs
    │   │   │   ├── AzureBlobFileService.cs
    │   │   │   ├── FileValidator.cs
    │   │   │   └── ImageProcessor.cs
    │   │   ├── Caching/
    │   │   │   ├── MemoryCacheService.cs
    │   │   │   ├── RedisCacheService.cs
    │   │   │   └── CacheKeyGenerator.cs
    │   │   ├── Email/
    │   │   │   ├── SmtpEmailService.cs
    │   │   │   ├── SendGridEmailService.cs
    │   │   │   └── EmailTemplateService.cs
    │   │   └── External/
    │   │       ├── FootballApiService.cs
    │   │       └── GeolocationService.cs
    │   ├── Configuration/
    │   │   ├── JwtSettings.cs
    │   │   ├── FileSettings.cs
    │   │   ├── CorsSettings.cs
    │   │   ├── DatabaseSettings.cs
    │   │   ├── CacheSettings.cs
    │   │   └── EmailSettings.cs
    │   ├── Utilities/
    │   │   ├── JsonFileHelper.cs
    │   │   ├── PathHelper.cs
    │   │   ├── SecurityHelper.cs
    │   │   └── LoggingHelper.cs
    │   └── Extensions/
    │       ├── ServiceCollectionExtensions.cs
    │       ├── ApplicationBuilderExtensions.cs
    │       └── ConfigurationExtensions.cs
    └── PolishFootballNetwork.API/
        ├── PolishFootballNetwork.API.csproj
        ├── Program.cs
        ├── appsettings.json
        ├── appsettings.Development.json
        ├── appsettings.Staging.json
        ├── appsettings.Production.json
        ├── Controllers/
        │   ├── Base/
        │   │   ├── BaseController.cs
        │   │   └── BaseApiController.cs
        │   ├── Public/
        │   │   ├── ClubsController.cs
        │   │   ├── ConnectionsController.cs
        │   │   ├── GraphDataController.cs
        │   │   └── HealthController.cs
        │   ├── Auth/
        │   │   ├── AuthController.cs
        │   │   └── SessionController.cs
        │   └── Admin/
        │       ├── AdminClubsController.cs
        │       ├── AdminConnectionsController.cs
        │       ├── AdminFilesController.cs
        │       ├── AdminDashboardController.cs
        │       └── AdminUsersController.cs
        ├── Middleware/
        │   ├── ExceptionHandlingMiddleware.cs
        │   ├── RequestLoggingMiddleware.cs
        │   ├── RateLimitingMiddleware.cs
        │   ├── SecurityHeadersMiddleware.cs
        │   └── CorsMiddleware.cs
        ├── Filters/
        │   ├── ValidationFilter.cs
        │   ├── AuthorizationFilter.cs
        │   ├── ExceptionFilter.cs
        │   └── CacheFilter.cs
        ├── Extensions/
        │   ├── ServiceCollectionExtensions.cs
        │   ├── ApplicationBuilderExtensions.cs
        │   ├── SwaggerExtensions.cs
        │   └── AuthenticationExtensions.cs
        ├── Configuration/
        │   ├── ApiConfiguration.cs
        │   ├── SwaggerConfiguration.cs
        │   └── CorsConfiguration.cs
        ├── Validators/
        │   ├── ClubValidators.cs
        │   ├── ConnectionValidators.cs
        │   └── AuthValidators.cs
        └── wwwroot/
            ├── logos/
            │   ├── clubs/
            │   └── default/
            ├── images/
            ├── css/
            └── js/
```

---

## 🗄️ DATABASE (DATA TIER) - Storage Layer

### Storage Layer Structure

```text
src/database/
├── README.md
├── scripts/
│   ├── setup/
│   │   ├── 01-create-database.sql
│   │   ├── 02-create-schemas.sql
│   │   ├── 03-create-tables.sql
│   │   ├── 04-create-indexes.sql
│   │   ├── 05-create-triggers.sql
│   │   └── 06-initial-data.sql
│   ├── migrations/
│   │   ├── 001-initial-schema.sql
│   │   ├── 002-add-audit-columns.sql
│   │   ├── 003-add-indexes.sql
│   │   └── (version-numbered migration files)
│   ├── seeds/
│   │   ├── clubs-seed.sql
│   │   ├── connections-seed.sql
│   │   ├── users-seed.sql
│   │   └── test-data.sql
│   ├── views/
│   │   ├── club-with-connections.sql
│   │   ├── connection-statistics.sql
│   │   └── admin-dashboard-stats.sql
│   ├── functions/
│   │   ├── calculate-graph-metrics.sql
│   │   ├── validate-connection.sql
│   │   └── audit-log-trigger.sql
│   ├── procedures/
│   │   ├── sp-import-clubs.sql
│   │   ├── sp-export-graph-data.sql
│   │   └── sp-cleanup-orphaned-data.sql
│   └── maintenance/
│       ├── backup-database.sql
│       ├── optimize-indexes.sql
│       └── cleanup-logs.sql
├── json-prototype/
│   ├── clubs.json
│   ├── connections.json
│   ├── users.json
│   └── schemas/
│       ├── club-schema.json
│       ├── connection-schema.json
│       └── user-schema.json
└── configurations/
    ├── postgresql.conf
    ├── pg_hba.conf
    ├── docker-postgresql.yml
    └── connection-strings.json
```

### Database Schema (PostgreSQL)

```sql
-- Core Tables
CREATE SCHEMA football_network;

CREATE TABLE football_network.clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(10),
    league VARCHAR(20) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'Poland',
    city VARCHAR(50) NOT NULL,
    logo_path VARCHAR(255),
    position_x DECIMAL(10,6),
    position_y DECIMAL(10,6),
    founded INTEGER,
    stadium VARCHAR(100),
    website VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

CREATE TABLE football_network.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_club_id UUID NOT NULL REFERENCES football_network.clubs(id),
    to_club_id UUID NOT NULL REFERENCES football_network.clubs(id),
    connection_type VARCHAR(20) NOT NULL,
    strength VARCHAR(10) NOT NULL,
    description TEXT,
    start_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_official BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT unique_connection UNIQUE (from_club_id, to_club_id),
    CONSTRAINT no_self_connection CHECK (from_club_id != to_club_id)
);

CREATE TABLE football_network.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'Admin',
    email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE football_network.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_clubs_league ON football_network.clubs(league);
CREATE INDEX idx_clubs_country ON football_network.clubs(country);
CREATE INDEX idx_clubs_active ON football_network.clubs(is_active);
CREATE INDEX idx_connections_from_club ON football_network.connections(from_club_id);
CREATE INDEX idx_connections_to_club ON football_network.connections(to_club_id);
CREATE INDEX idx_connections_type ON football_network.connections(connection_type);
CREATE INDEX idx_connections_active ON football_network.connections(is_active);
CREATE INDEX idx_audit_logs_table_record ON football_network.audit_logs(table_name, record_id);
```

---

## 🧪 TESTING STRUCTURE

### Testing Organization

```text
tests/
├── frontend/
│   ├── unit/
│   │   ├── components/
│   │   ├── services/
│   │   ├── pipes/
│   │   └── guards/
│   ├── integration/
│   │   ├── auth-flow/
│   │   ├── admin-panel/
│   │   └── graph-viewer/
│   └── e2e/
│       ├── cypress/
│       │   ├── fixtures/
│       │   ├── integration/
│       │   ├── plugins/
│       │   └── support/
│       └── playwright/
│           ├── tests/
│           ├── fixtures/
│           └── config/
├── backend/
│   ├── unit/
│   │   ├── Domain.Tests/
│   │   ├── Application.Tests/
│   │   ├── Infrastructure.Tests/
│   │   └── API.Tests/
│   ├── integration/
│   │   ├── API.IntegrationTests/
│   │   ├── Database.IntegrationTests/
│   │   └── Services.IntegrationTests/
│   └── performance/
│       ├── load-tests/
│       ├── stress-tests/
│       └── endurance-tests/
└── integration/
    ├── api-frontend/
    ├── database-api/
    └── full-stack/
```

---

## 📚 DOCUMENTATION STRUCTURE

### Documentation Organization

```text
docs/
├── README.md
├── api/
│   ├── swagger.json
│   ├── postman-collection.json
│   ├── endpoints/
│   │   ├── auth.md
│   │   ├── clubs.md
│   │   ├── connections.md
│   │   └── admin.md
│   └── examples/
│       ├── requests/
│       └── responses/
├── architecture/
│   ├── overview.md
│   ├── frontend-architecture.md
│   ├── backend-architecture.md
│   ├── database-design.md
│   ├── security-design.md
│   └── diagrams/
│       ├── system-architecture.png
│       ├── database-erd.png
│       ├── component-diagram.png
│       └── sequence-diagrams/
├── deployment/
│   ├── local-development.md
│   ├── docker-setup.md
│   ├── azure-deployment.md
│   ├── aws-deployment.md
│   └── kubernetes/
│       ├── manifests/
│       └── helm-charts/
├── user-guides/
│   ├── public-user-guide.md
│   ├── admin-user-guide.md
│   ├── api-usage-guide.md
│   └── troubleshooting.md
├── development/
│   ├── setup-guide.md
│   ├── coding-standards.md
│   ├── contributing.md
│   ├── testing-guide.md
│   └── release-process.md
└── assets/
    ├── images/
    ├── videos/
    └── screenshots/
```

---

## 🛠️ TOOLS & UTILITIES

### Development Tools Structure

```text
tools/
├── data-seeders/
│   ├── club-data-seeder/
│   │   ├── src/
│   │   ├── data/
│   │   │   ├── ekstraklasa-clubs.csv
│   │   │   ├── fortuna-liga-clubs.csv
│   │   │   └── european-clubs.csv
│   │   └── package.json
│   ├── connection-data-seeder/
│   │   ├── src/
│   │   ├── data/
│   │   │   ├── rivalries.csv
│   │   │   ├── alliances.csv
│   │   │   └── friendships.csv
│   │   └── package.json
│   └── logo-downloader/
│       ├── src/
│       ├── config/
│       └── downloaded-logos/
├── logo-processors/
│   ├── svg-optimizer/
│   │   ├── src/
│   │   ├── input/
│   │   └── output/
│   ├── batch-converter/
│   │   ├── src/
│   │   └── config/
│   └── logo-validator/
│       ├── src/
│       └── rules/
├── deployment/
│   ├── azure-scripts/
│   │   ├── deploy.sh
│   │   ├── setup-resources.sh
│   │   └── configs/
│   ├── aws-scripts/
│   │   ├── deploy.sh
│   │   ├── cloudformation/
│   │   └── configs/
│   ├── docker-scripts/
│   │   ├── build-all.sh
│   │   ├── push-images.sh
│   │   └── docker-compose.prod.yml
│   └── kubernetes/
│       ├── manifests/
│       ├── helm-charts/
│       └── scripts/
└── monitoring/
    ├── health-checker/
    │   ├── src/
    │   └── config/
    ├── log-analyzer/
    │   ├── src/
    │   └── rules/
    └── performance-monitor/
        ├── src/
        └── dashboards/
```

---

## 📦 INFRASTRUCTURE & DEPLOYMENT

### Infrastructure Structure

```text
infrastructure/
├── docker/
│   ├── frontend/
│   │   ├── Dockerfile
│   │   ├── nginx.conf
│   │   └── .dockerignore
│   ├── backend/
│   │   ├── Dockerfile
│   │   ├── Dockerfile.development
│   │   └── .dockerignore
│   ├── database/
│   │   ├── Dockerfile
│   │   ├── init-scripts/
│   │   └── data/
│   └── nginx/
│       ├── Dockerfile
│       ├── nginx.conf
│       └── ssl/
├── kubernetes/
│   ├── namespace.yaml
│   ├── configmaps/
│   ├── secrets/
│   ├── deployments/
│   │   ├── frontend-deployment.yaml
│   │   ├── backend-deployment.yaml
│   │   └── database-deployment.yaml
│   ├── services/
│   │   ├── frontend-service.yaml
│   │   ├── backend-service.yaml
│   │   └── database-service.yaml
│   ├── ingress/
│   │   └── ingress.yaml
│   └── helm-charts/
│       └── polish-football-network/
├── terraform/
│   ├── environments/
│   │   ├── development/
│   │   ├── staging/
│   │   └── production/
│   ├── modules/
│   │   ├── networking/
│   │   ├── compute/
│   │   ├── database/
│   │   └── monitoring/
│   └── scripts/
│       ├── plan.sh
│       ├── apply.sh
│       └── destroy.sh
└── monitoring/
    ├── prometheus/
    │   ├── config/
    │   └── rules/
    ├── grafana/
    │   ├── dashboards/
    │   └── datasources/
    └── elk-stack/
        ├── elasticsearch/
        ├── logstash/
        └── kibana/
```

---

## 🎯 KEY FEATURES MAPPING

### Frontend Features

- **Graph Visualization**: `src/frontend/src/app/features/graph-viewer/`
- **Admin Panel**: `src/frontend/src/app/features/admin-panel/`
- **Authentication**: `src/frontend/src/app/features/auth/`
- **Shared Components**: `src/frontend/src/app/shared/`

### Backend Features

- **Domain Logic**: `src/backend/src/PolishFootballNetwork.Domain/`
- **Business Logic**: `src/backend/src/PolishFootballNetwork.Application/`
- **Data Access**: `src/backend/src/PolishFootballNetwork.Infrastructure/`
- **API Endpoints**: `src/backend/src/PolishFootballNetwork.API/`

### Database Features

- **Schema Definition**: `src/database/scripts/setup/`
- **Data Seeding**: `src/database/scripts/seeds/`
- **Migrations**: `src/database/scripts/migrations/`
- **JSON Prototype**: `src/database/json-prototype/`

---

## 🚀 GETTING STARTED

### Development Setup Commands

```bash
# Clone repository
git clone https://github.com/your-org/PolishFootballNetwork.git
cd PolishFootballNetwork

# Setup development environment
./scripts/setup-dev.sh

# Start frontend development server
cd src/frontend
npm install
npm start

# Start backend development server
cd src/backend
dotnet restore
dotnet run --project src/PolishFootballNetwork.API

# Setup database (JSON prototype)
cd src/database/json-prototype
# Files are ready to use

# Run all tests
./scripts/test-all.sh

# Build and run with Docker
docker-compose up --build
```

---

## 📋 NOTES

### Development Considerations

- **Modular Architecture**: Each tier is independently deployable and scalable
- **Clean Separation**: Clear boundaries between presentation, business, and data layers
- **Technology Flexibility**: JSON prototype can be easily migrated to PostgreSQL
- **Testing Strategy**: Comprehensive testing at all levels
- **Documentation**: Living documentation that evolves with the codebase

### Scalability Considerations

- **Horizontal Scaling**: Microservices-ready architecture
- **Database Migration**: Smooth transition from JSON to SQL database
- **CDN Integration**: Static asset optimization
- **Caching Strategy**: Multiple caching layers for performance
- **Monitoring**: Comprehensive observability and alerting

This project structure provides a solid foundation for developing the Polish Football Network application with clear separation of concerns, scalability, and maintainability in mind.
