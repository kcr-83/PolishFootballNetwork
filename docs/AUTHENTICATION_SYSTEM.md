# Authentication and Authorization System Documentation

## Overview

This document describes the comprehensive authentication and authorization system implemented for the Polish Football Network application. The system includes JWT token-based authentication, role-based authorization with hierarchical permissions, security middleware, and comprehensive audit logging.

## Architecture

The authentication system follows Clean Architecture principles with clear separation of concerns:

- **Domain Layer**: User entities, role enums, and domain events
- **Application Layer**: CQRS commands/queries for authentication operations
- **Infrastructure Layer**: JWT token management, security services, authorization policies
- **Presentation Layer**: Authentication endpoints using minimal API pattern

## Authentication Features

### 1. JWT Token Authentication

**Location**: `src/PolishFootballNetwork.Infrastructure/Authentication/`

**Components**:
- `AuthenticationService` - Core authentication logic with JWT token generation
- `JwtOptions` - Configuration for JWT settings
- JWT Bearer middleware configuration in `DependencyInjection.cs`

**Features**:
- Secure JWT token generation with configurable expiration
- Refresh token support with in-memory storage
- BCrypt password hashing for security
- Token validation and extraction of user claims
- Comprehensive error handling for authentication failures

### 2. Authentication Endpoints

**Location**: `src/PolishFootballNetwork.WebApi/Endpoints/AuthEndpoints.cs`

**Available Endpoints**:

#### POST `/api/auth/login`
- Authenticates user credentials
- Returns JWT access token and refresh token
- Logs authentication attempts with IP tracking
- Rate limiting protection (5 attempts per 15 minutes)

#### POST `/api/auth/refresh`
- Refreshes expired access tokens using valid refresh token
- Issues new access token while maintaining security
- Logs token refresh events

#### POST `/api/auth/logout`
- Revokes user's refresh tokens
- Logs logout events with session information
- Cleans up authentication state

#### GET `/api/auth/validate`
- Validates current JWT token
- Returns user information and token status
- Useful for frontend authentication state management

### 3. CQRS Command/Query Handlers

**Location**: `src/PolishFootballNetwork.Application/Features/Authentication/`

**Components**:
- `LoginCommand` & `LoginCommandHandler` - User login processing
- `RefreshTokenCommand` & `RefreshTokenCommandHandler` - Token refresh logic
- `LogoutCommand` & `LogoutCommandHandler` - User logout processing
- `ValidateTokenQuery` & `ValidateTokenQueryHandler` - Token validation

## Authorization Features

### 1. Role-Based Authorization

**Location**: `src/PolishFootballNetwork.Infrastructure/Authorization/`

**Role Hierarchy**:
```
SuperAdmin (4) - Full system access
├── Administrator (3) - User management, system configuration
├── Moderator (2) - Content moderation, user support
└── User (1) - Basic application features
```

**Components**:
- `AuthorizationPolicies` - Defines role-based authorization policies
- `RoleAuthorizationHandler` - Handles role hierarchy enforcement
- `AuthorizationService` - Programmatic permission checking

### 2. Authorization Policies

**Available Policies**:
- `RequireUser` - Minimum User role (level 1+)
- `RequireModerator` - Minimum Moderator role (level 2+)
- `RequireAdministrator` - Minimum Administrator role (level 3+)
- `RequireSuperAdmin` - SuperAdmin role only (level 4)

### 3. Example Authorization Endpoints

**Location**: `src/PolishFootballNetwork.WebApi/Endpoints/UserEndpoints.cs`

**Demonstration Endpoints**:
- `GET /api/users/profile` - User level access (all authenticated users)
- `GET /api/users/all` - Moderator level access (moderators and above)
- `POST /api/users/{id}/ban` - Administrator level access (administrators only)
- `DELETE /api/users/{id}` - SuperAdmin level access (super admin only)

## Security Middleware

### 1. Global Exception Handling

**Location**: `src/PolishFootballNetwork.Infrastructure/Middleware/GlobalExceptionMiddleware.cs`

**Features**:
- Centralized exception handling for all requests
- Security-conscious error responses (no sensitive information exposure)
- Comprehensive logging of exceptions with request context
- User-friendly error messages for different exception types

### 2. Authentication Rate Limiting

**Location**: `src/PolishFootballNetwork.Infrastructure/Middleware/AuthenticationRateLimitMiddleware.cs`

**Features**:
- IP-based rate limiting for authentication endpoints
- Configurable attempt limits (default: 5 attempts per 15 minutes)
- Automatic blocking of suspicious authentication attempts
- Memory-based attempt tracking with automatic cleanup

### 3. Audit Logging

**Location**: `src/PolishFootballNetwork.Infrastructure/Logging/AuditLogger.cs`

**Tracked Events**:
- Login attempts (successful and failed)
- Token refresh operations
- Logout events
- Authorization failures
- Administrative actions

**Logged Information**:
- User ID and username
- IP address and request path
- Timestamp and event type
- Additional context data
- Success/failure status

## Configuration

### JWT Settings

**Location**: `appsettings.json`

```json
{
  "Jwt": {
    "Key": "your-secret-key-here",
    "Issuer": "PolishFootballNetwork",
    "Audience": "PolishFootballNetwork-Users",
    "ExpirationMinutes": 60
  }
}
```

### Authentication Services Registration

**Location**: `src/PolishFootballNetwork.Infrastructure/DependencyInjection.cs`

The system automatically registers:
- JWT Bearer authentication
- Authorization policies
- Security middleware
- Audit logging services
- Authentication services

## Usage Examples

### Frontend Authentication Flow

```typescript
// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'password' })
});

// Use token in subsequent requests
const token = loginResponse.token;
fetch('/api/users/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Programmatic Authorization Checking

```csharp
public class SomeService
{
    private readonly IAuthorizationService _authorizationService;
    
    public async Task<bool> CanUserPerformAction(int userId, string action)
    {
        return await _authorizationService.CanAccessResource(userId, action);
    }
}
```

## Security Considerations

### Implemented Security Measures

1. **Password Security**: BCrypt hashing with salt
2. **Token Security**: JWT with secure key signing
3. **Rate Limiting**: Protection against brute force attacks
4. **Audit Logging**: Comprehensive security event tracking
5. **Role Hierarchy**: Prevents privilege escalation
6. **Error Handling**: No sensitive information exposure
7. **HTTPS**: Enforced for all authentication endpoints

### Best Practices Followed

- Secure token storage recommendations for frontend
- Proper token expiration and refresh mechanisms
- Comprehensive input validation
- Principle of least privilege in authorization
- Defense in depth security architecture

## Testing

### Integration Testing Recommendations

1. Test all authentication endpoints with valid/invalid credentials
2. Verify role-based authorization enforcement
3. Test rate limiting functionality
4. Validate audit logging captures
5. Test token refresh mechanisms
6. Verify middleware error handling

### Security Testing

1. Attempt privilege escalation attacks
2. Test rate limiting effectiveness
3. Verify token tampering protection
4. Test with malformed requests
5. Validate error message security

## Maintenance

### Regular Tasks

1. Monitor audit logs for suspicious activity
2. Review and rotate JWT signing keys
3. Update password hashing parameters as needed
4. Review authorization policies for business changes
5. Monitor rate limiting effectiveness

### Future Enhancements

1. **Database Persistence**: Move refresh tokens from memory to database
2. **External Identity Providers**: Add OAuth2/OpenID Connect support
3. **Advanced Rate Limiting**: Implement distributed rate limiting
4. **Session Management**: Add session timeout and concurrent session control
5. **2FA Support**: Implement two-factor authentication

## Troubleshooting

### Common Issues

1. **Token Expiration**: Check JWT expiration settings and refresh token flow
2. **Authorization Failures**: Verify user roles and policy requirements
3. **Rate Limiting Blocks**: Check IP-based attempt counters
4. **Middleware Errors**: Review middleware pipeline order

### Debug Information

- All authentication events are logged with structured logging
- Use audit logs to trace authentication and authorization decisions
- Monitor rate limiting metrics for performance tuning
- Review exception logs for security incidents

---

**Implementation Status**: ✅ Complete
**Last Updated**: Current
**Version**: 1.0.0