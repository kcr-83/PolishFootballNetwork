# Polish Football Network - Class Diagrams

This document contains class diagrams based on the data model for the Polish Football Network application. The diagrams represent the main entities and their relationships.

## Users and Authentication

```mermaid
classDiagram
    class User {
        +UUID id
        +String username
        +String email
        +String passwordHash
        +String passwordSalt
        +String firstName
        +String lastName
        +String displayName
        +UserRole role
        +String[] permissions
        +Boolean isActive
        +Boolean isVerified
        +Boolean isLocked
        +Integer failedLoginAttempts
        +DateTime lastFailedLogin
        +DateTime lastLoginAt
        +DateTime lastActivityAt
        +String currentSessionId
        +String passwordResetToken
        +DateTime passwordResetExpires
        +String emailVerificationToken
        +DateTime emailVerificationExpires
        +String timezone
        +String locale
        +String theme
        +DateTime createdAt
        +DateTime updatedAt
        +UUID createdBy
        +DateTime lastPasswordChange
        +login(username, password)
        +logout()
        +changePassword(oldPassword, newPassword)
        +resetPassword(token, newPassword)
        +verifyEmail(token)
        +updateProfile(profileData)
    }

    class UserSession {
        +UUID id
        +String sessionId
        +UUID userId
        +String ipAddress
        +String userAgent
        +String deviceType
        +String browser
        +String os
        +String country
        +String city
        +String timezone
        +DateTime startedAt
        +DateTime lastActivityAt
        +DateTime endedAt
        +Integer durationSeconds
        +Integer pageViews
        +Integer apiCalls
        +Integer actionsPerformed
        +Boolean isActive
        +startSession()
        +endSession()
        +updateActivity()
        +trackPageView()
        +trackApiCall()
    }

    User ||--o{ UserSession : "has many"
```

## Clubs and Connections

```mermaid
classDiagram
    class Club {
        +UUID id
        +String name
        +String shortName
        +String slug
        +LeagueType league
        +String country
        +String city
        +String region
        +String logoPath
        +String logoUrl
        +Decimal positionX
        +Decimal positionY
        +Integer founded
        +String stadium
        +Integer stadiumCapacity
        +String website
        +String officialColors
        +String description
        +String nickname
        +String motto
        +Boolean isActive
        +Boolean isVerified
        +Boolean isFeatured
        +String metaTitle
        +String metaDescription
        +String searchKeywords
        +DateTime createdAt
        +DateTime updatedAt
        +UUID createdBy
        +UUID updatedBy
        +Integer version
        +updatePosition(x, y)
        +uploadLogo(file)
        +updateDetails(clubData)
        +toggleActive()
        +verify()
        +feature()
    }

    class Connection {
        +UUID id
        +UUID fromClubId
        +UUID toClubId
        +ConnectionType connectionType
        +ConnectionStrength strength
        +String title
        +String description
        +String historicalContext
        +Date startDate
        +Date endDate
        +Boolean isActive
        +Boolean isOfficial
        +Boolean isHistorical
        +Boolean isPublic
        +String sourceUrl
        +String[] evidenceUrls
        +Integer reliabilityScore
        +Integer displayOrder
        +String colorOverride
        +DateTime createdAt
        +DateTime updatedAt
        +UUID createdBy
        +UUID updatedBy
        +Integer version
        +validateConnection()
        +toggleActive()
        +updateStrength(newStrength)
        +addEvidence(url)
        +setReliabilityScore(score)
    }

    class File {
        +UUID id
        +String originalFilename
        +String storedFilename
        +String filePath
        +String fileUrl
        +FileType fileType
        +String mimeType
        +BigInteger fileSizeBytes
        +String fileHash
        +Integer imageWidth
        +Integer imageHeight
        +String imageFormat
        +String entityType
        +UUID entityId
        +String purpose
        +Boolean isActive
        +Boolean isProcessed
        +Boolean isPublic
        +String altText
        +String caption
        +String[] tags
        +DateTime uploadedAt
        +UUID uploadedBy
        +DateTime processedAt
        +upload(fileData)
        +process()
        +delete()
        +generateUrl()
        +validateFile()
    }

    Club ||--o{ Connection : "from club"
    Club ||--o{ Connection : "to club"
    Club ||--o{ File : "has logo"
    User ||--o{ Club : "creates"
    User ||--o{ Connection : "creates"
    User ||--o{ File : "uploads"
```

## Activity Logging and Audit

```mermaid
classDiagram
    class ActivityLog {
        +UUID id
        +ActivityType activityType
        +String tableName
        +UUID recordId
        +UUID userId
        +String sessionId
        +String ipAddress
        +String userAgent
        +JSON oldValues
        +JSON newValues
        +String[] changedFields
        +String description
        +String reason
        +String requestId
        +Integer durationMs
        +DateTime occurredAt
        +logActivity(type, table, record, changes)
        +getAuditTrail(recordId)
        +getUserActivity(userId)
        +getSystemActivity(dateRange)
    }

    class SystemLog {
        +UUID id
        +String level
        +String category
        +String component
        +String message
        +String exceptionType
        +String exceptionMessage
        +String stackTrace
        +String requestId
        +String correlationId
        +UUID userId
        +JSON properties
        +DateTime timestamp
        +Integer durationMs
        +Integer memoryUsageMb
        +logError(exception, context)
        +logWarning(message, properties)
        +logInfo(message, properties)
        +logDebug(message, properties)
    }

    User ||--o{ ActivityLog : "performs activities"
    ActivityLog }o--|| Club : "tracks changes"
    ActivityLog }o--|| Connection : "tracks changes"
    SystemLog }o--|| User : "logs user actions"
```

## Analytics and Metrics

```mermaid
classDiagram
    class GraphMetric {
        +UUID id
        +String metricName
        +Decimal metricValue
        +String metricType
        +String scope
        +UUID scopeId
        +String periodType
        +DateTime periodStart
        +DateTime periodEnd
        +String description
        +String calculationMethod
        +DateTime calculatedAt
        +calculateNetworkDensity()
        +calculateCentrality()
        +calculateConnectivity()
        +updateMetrics()
        +getMetricHistory(metricName, period)
    }

    class AppSetting {
        +UUID id
        +String settingKey
        +String settingValue
        +String settingType
        +String category
        +String description
        +String defaultValue
        +String validationRegex
        +String[] allowedValues
        +Decimal minValue
        +Decimal maxValue
        +Boolean isSensitive
        +Boolean isReadonly
        +DateTime createdAt
        +DateTime updatedAt
        +UUID updatedBy
        +getValue()
        +setValue(value)
        +validate(value)
        +resetToDefault()
        +getByCategory(category)
    }

    GraphMetric }o--|| Club : "measures"
    User ||--o{ AppSetting : "manages"
```

## Data Views and Complex Queries

```mermaid
classDiagram
    class ClubWithStats {
        +UUID id
        +String name
        +String shortName
        +LeagueType league
        +String city
        +String logoUrl
        +Integer totalConnections
        +Integer allianceCount
        +Integer rivalryCount
        +Integer friendshipCount
        +String logoUrlFull
        +getClubStats()
        +getConnectionBreakdown()
        +calculateNetworkPosition()
    }

    class ConnectionDetailed {
        +UUID id
        +UUID fromClubId
        +UUID toClubId
        +ConnectionType connectionType
        +ConnectionStrength strength
        +String fromClubName
        +String fromClubShortName
        +LeagueType fromClubLeague
        +String fromClubCity
        +String toClubName
        +String toClubShortName
        +LeagueType toClubLeague
        +String toClubCity
        +Boolean isActive
        +getConnectionDetails()
        +getClubInformation()
        +validateConnection()
    }

    class AdminDashboardStats {
        +Integer totalClubs
        +Integer ekstraklasaClubs
        +Integer fortunaLigaClubs
        +Integer europeanClubs
        +Integer totalConnections
        +Integer alliances
        +Integer rivalries
        +Integer friendships
        +Integer totalUsers
        +Integer totalFiles
        +Integer todayActivities
        +generateStats()
        +getOverview()
        +getBreakdowns()
        +getRecentActivity()
    }

    ClubWithStats }o--|| Club : "aggregates"
    ConnectionDetailed }o--|| Connection : "details"
    AdminDashboardStats }o--|| Club : "summarizes"
    AdminDashboardStats }o--|| Connection : "summarizes"
    AdminDashboardStats }o--|| User : "summarizes"
    AdminDashboardStats }o--|| File : "summarizes"
```

## Enums and Value Objects

```mermaid
classDiagram
    class LeagueType {
        <<enumeration>>
        Ekstraklasa
        Fortuna1Liga
        EuropeanClub
    }

    class ConnectionType {
        <<enumeration>>
        Alliance
        Rivalry
        Friendship
    }

    class ConnectionStrength {
        <<enumeration>>
        Weak
        Medium
        Strong
    }

    class UserRole {
        <<enumeration>>
        Admin
        SuperAdmin
    }

    class ActivityType {
        <<enumeration>>
        CREATE
        UPDATE
        DELETE
        LOGIN
        LOGOUT
        UPLOAD
        DOWNLOAD
    }

    class FileType {
        <<enumeration>>
        LOGO_SVG
        IMAGE_PNG
        IMAGE_JPG
        DOCUMENT_PDF
    }

    class Point2D {
        +Decimal x
        +Decimal y
        +calculateDistance(other)
        +translate(deltaX, deltaY)
        +isValid()
    }

    Club ||--|| LeagueType : "belongs to"
    Connection ||--|| ConnectionType : "has type"
    Connection ||--|| ConnectionStrength : "has strength"
    User ||--|| UserRole : "has role"
    ActivityLog ||--|| ActivityType : "logs type"
    File ||--|| FileType : "is type"
    Club ||--o{ Point2D : "positioned at"
```

## Note

The original SQL data model for the Polish Football Network application focuses on football clubs, their connections, users, files, and system administration. The entities you mentioned (invoices, change requests, refund requests) are not present in the current data model.

If you need these additional entities, they would need to be added to the database schema first. The diagrams above represent the actual entities found in the `data_model.sql` file, which include:

- **Users**: System administrators with authentication and session management
- **Clubs**: Football clubs with detailed information and positioning
- **Connections**: Relationships between clubs (alliances, rivalries, friendships)
- **Files**: Logo and document management
- **Activity Logs**: Audit trail for all system activities
- **System Logs**: Application logging and monitoring
- **Graph Metrics**: Analytics and network statistics
- **App Settings**: System configuration management

All classes follow the mermaid format you specified, with proper typing, relationships, and method signatures based on the database schema and business logic requirements.
