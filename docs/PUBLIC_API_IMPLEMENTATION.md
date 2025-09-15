# Polish Football Network - Public API Implementation

## Overview

This document outlines the comprehensive public API implementation for the Polish Football Network project. The API provides endpoints for graph visualization with advanced features including caching, compression, performance monitoring, and comprehensive OpenAPI documentation.

## 🎯 Key Features Implemented

### ✅ Public API Endpoints
- **Clubs API**: Paginated club listings with filtering and search capabilities
- **Connections API**: Network connections with filtering and club-specific queries
- **Graph API**: Optimized graph visualization data with aggressive caching

### ✅ Performance Optimization
- **Response Caching**: Output caching policies with configurable TTL
- **Memory Caching**: In-memory caching for graph data (5-minute sliding expiration)
- **Compression**: Brotli and Gzip compression for optimal bandwidth usage
- **Cache Headers**: ETag support for conditional requests

### ✅ API Quality Features
- **Standardized Responses**: ApiResponse<T> wrapper with consistent error handling
- **Pagination**: Complete pagination metadata with performance metrics
- **Validation**: Comprehensive input validation with detailed error messages
- **Documentation**: OpenAPI/Swagger integration with detailed endpoint descriptions

## 📊 API Endpoints Overview

### 1. Clubs Endpoints (`/api/clubs`)

#### GET `/api/clubs`
- **Purpose**: Retrieve paginated list of clubs with filtering
- **Parameters**: 
  - `pageNumber` (default: 1)
  - `pageSize` (default: 10, max: 100)
  - `league` (optional filter)
  - `country` (optional filter) 
  - `city` (optional filter)
- **Caching**: 2-minute output cache
- **Response**: Paginated list with metadata

#### GET `/api/clubs/{id}`
- **Purpose**: Get detailed information about a specific club
- **Parameters**: `id` (required)
- **Caching**: 5-minute output cache
- **Response**: Single club with full details

#### GET `/api/clubs/search`
- **Purpose**: Fuzzy search clubs by name
- **Parameters**: 
  - `query` (required, min 2 characters)
  - `maxResults` (default: 10, max: 50)
- **Caching**: 3-minute output cache
- **Response**: List of matching clubs

### 2. Connections Endpoints (`/api/connections`)

#### GET `/api/connections`
- **Purpose**: Retrieve paginated list of connections with filtering
- **Parameters**:
  - `pageNumber` (default: 1)
  - `pageSize` (default: 10, max: 100)
  - `type` (optional filter by connection type)
  - `minStrength` (optional minimum strength filter)
- **Caching**: 3-minute output cache
- **Response**: Paginated connections list

#### GET `/api/connections/by-club/{clubId}`
- **Purpose**: Get all connections for a specific club
- **Parameters**:
  - `clubId` (required)
  - `type` (optional filter)
  - `minStrength` (optional filter)
- **Caching**: 5-minute output cache
- **Response**: List of club connections

### 3. Graph Visualization Endpoint (`/api/graph-data`)

#### GET `/api/graph-data`
- **Purpose**: Get complete graph visualization data
- **Features**:
  - **Aggressive Caching**: 5-minute memory cache with sliding expiration
  - **Optimized Data**: Node sizing based on connection count
  - **Performance Metrics**: Request timing and cache hit/miss indicators
- **Response**: Complete graph with nodes and edges for visualization

## 🔧 Technical Implementation

### Infrastructure Components

#### 1. PaginationMetadata.cs
```csharp
public static class PaginationMetadata
{
    public static PaginationMetadata Create(int pageNumber, int pageSize, int totalCount);
    public static PerformanceMetrics Create(TimeSpan requestDuration, int queryCount, bool fromCache = false);
}
```

#### 2. CachingExtensions.cs
```csharp
public static class CachingExtensions
{
    public static IServiceCollection AddCachingAndCompression(this IServiceCollection services);
    public static IApplicationBuilder UseCachingAndCompression(this IApplicationBuilder app);
}
```

#### 3. ApiResponse Extensions
```csharp
public static class ApiResponseExtensions
{
    public static ApiResponse<PagedResult<T>> CreatePaginatedSuccess<T>(/*...*/);
    public static ApiResponse<T> CreateSuccessWithPerformance<T>(/*...*/);
}
```

### Caching Strategy

| Endpoint | Cache Type | Duration | Key Strategy |
|----------|------------|----------|-------------|
| GET /api/clubs | Output Cache | 2 minutes | Query parameters |
| GET /api/clubs/{id} | Output Cache | 5 minutes | Club ID |
| GET /api/clubs/search | Output Cache | 3 minutes | Search query |
| GET /api/connections | Output Cache | 3 minutes | Query parameters |
| GET /api/connections/by-club/{id} | Output Cache | 5 minutes | Club ID + filters |
| GET /api/graph-data | Memory Cache | 5 minutes | Static key with sliding expiration |

### Performance Headers

All responses include performance-related headers:
- `X-Request-Duration`: Request processing time
- `X-Query-Count`: Number of database queries executed
- `X-Cache-Status`: Cache hit/miss status
- `ETag`: For conditional requests
- `Cache-Control`: Caching directives

### Compression Configuration

```csharp
// Brotli compression (preferred)
services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Optimal;
});

// Gzip fallback
services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Optimal;
});
```

## 📝 OpenAPI Documentation

### Swagger Configuration
- **Title**: Polish Football Network API
- **Version**: v1
- **Description**: Public API for accessing Polish football club data and connections
- **Contact**: contact@polishfootballnetwork.com

### Documentation Features
- Comprehensive endpoint descriptions
- Request/response examples
- Parameter validation details
- Error response documentation
- Performance metrics explanation

## 🚀 Usage Examples

### Get Clubs with Pagination
```http
GET /api/clubs?pageNumber=1&pageSize=20&league=Ekstraklasa
Accept: application/json
```

### Search Clubs
```http
GET /api/clubs/search?query=Lech&maxResults=10
Accept: application/json
```

### Get Club Connections
```http
GET /api/connections/by-club/123?type=Transfer&minStrength=5
Accept: application/json
```

### Get Graph Data
```http
GET /api/graph-data
Accept: application/json
If-None-Match: "W/\"cached-graph-data-hash\""
```

## 📊 Response Format

### Standard Success Response
```json
{
  "data": {
    // Actual response data
  },
  "success": true,
  "message": "Request completed successfully",
  "errors": [],
  "metadata": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "pageSize": 10,
      "totalCount": 47,
      "hasPrevious": false,
      "hasNext": true
    },
    "performance": {
      "requestDuration": "00:00:00.1234567",
      "queryCount": 2,
      "fromCache": false
    }
  }
}
```

### Error Response
```json
{
  "data": null,
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "pageSize",
      "message": "Page size must be between 1 and 100"
    }
  ],
  "metadata": null
}
```

## ✅ Testing Recommendations

### 1. Performance Testing
- Load test with concurrent requests to verify caching effectiveness
- Monitor response times with cache hits vs misses
- Test compression ratios for different response sizes

### 2. Functional Testing
- Verify all pagination scenarios (first, middle, last pages)
- Test filter combinations and edge cases
- Validate search functionality with various query patterns

### 3. Caching Validation
- Verify cache headers are correctly set
- Test conditional requests with ETags
- Confirm cache invalidation timing

## 🔐 Security Considerations

### Input Validation
- All query parameters validated with data annotations
- Page size limits prevent excessive data retrieval
- Search query minimum length prevents performance issues

### Rate Limiting (Recommended)
Consider implementing rate limiting for production:
```csharp
services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("Api", options =>
    {
        options.PermitLimit = 100;
        options.Window = TimeSpan.FromMinutes(1);
    });
});
```

## 🏗️ Architecture Benefits

### Clean Architecture Compliance
- **Domain Layer**: Pure business entities and rules
- **Application Layer**: CQRS commands/queries with validation
- **Infrastructure Layer**: Data access and external services
- **Presentation Layer**: Minimal API endpoints with OpenAPI integration

### CQRS Implementation
- Separate read and write operations
- Optimized queries for public API consumption
- Custom mediator implementation (no third-party dependencies)

### Performance-First Design
- Output caching for frequently requested data
- Memory caching for expensive operations
- Response compression for bandwidth optimization
- Performance monitoring built into every request

## 📈 Monitoring and Metrics

### Built-in Metrics
- Request duration tracking
- Database query count per request
- Cache hit/miss ratios
- Response compression effectiveness

### Recommended Monitoring
- API response times by endpoint
- Cache hit ratios and cache size
- Request volume and error rates
- Database query performance

## 🎉 Summary

The Polish Football Network Public API implementation provides:

✅ **Complete Public API** with 6 endpoints covering clubs, connections, and graph data  
✅ **Advanced Caching** with output caching and memory caching strategies  
✅ **Performance Optimization** with compression and request metrics  
✅ **Developer Experience** with comprehensive OpenAPI documentation  
✅ **Production Ready** with validation, error handling, and monitoring  
✅ **Clean Architecture** following SOLID principles and Clean Architecture patterns  

The implementation is now ready for testing, deployment, and integration with frontend applications requiring graph visualization capabilities.