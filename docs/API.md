# API Documentation

## Overview

The Polish Football Network API provides RESTful endpoints for managing football clubs, their relationships, and user authentication. The API follows OpenAPI 3.0 specification and includes comprehensive error handling, validation, and authentication.

## Base URL

- **Development**: `http://localhost:5000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@pfn.com",
  "password": "Admin123!"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "expiresAt": "2024-01-01T12:00:00Z",
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@pfn.com",
      "role": "Admin"
    }
  }
}
```

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "errors": []
}
```

Error responses:
```json
{
  "success": false,
  "data": null,
  "message": "Operation failed",
  "errors": [
    {
      "field": "Name",
      "message": "Club name is required"
    }
  ]
}
```

## Endpoints

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
```

#### Refresh Token
```http
POST /api/auth/refresh
```

#### Logout
```http
POST /api/auth/logout
```

### Public Club Endpoints

#### Get All Clubs
```http
GET /api/clubs?page=1&pageSize=20&league=Ekstraklasa
```

Parameters:
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20, max: 100)
- `league` (optional): Filter by league
- `country` (optional): Filter by country
- `search` (optional): Search by name

Response:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Legia Warszawa",
        "shortName": "Legia",
        "slug": "legia-warszawa",
        "league": "Ekstraklasa",
        "city": "Warszawa",
        "logoPath": "/uploads/logos/legia.svg",
        "isActive": true
      }
    ],
    "totalCount": 45,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

#### Get Club by ID
```http
GET /api/clubs/{id}
```

### Admin Club Endpoints (Requires Authentication)

#### Create Club
```http
POST /api/admin/clubs
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Wisła Kraków",
  "shortName": "Wisła",
  "league": "Ekstraklasa",
  "country": "Poland",
  "city": "Kraków",
  "founded": 1906,
  "stadium": "Stadion Wisły",
  "website": "https://wisla.krakow.pl",
  "description": "Historic club from Kraków"
}
```

#### Update Club
```http
PUT /api/admin/clubs/{id}
```

#### Delete Club
```http
DELETE /api/admin/clubs/{id}
```

#### Upload Club Logo
```http
POST /api/admin/clubs/{id}/upload-logo
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: [SVG file]
```

### Connection Endpoints

#### Get All Connections
```http
GET /api/connections?type=Rivalry&strength=Strong
```

#### Create Connection (Admin)
```http
POST /api/admin/connections
Authorization: Bearer <token>

{
  "fromClubId": "uuid",
  "toClubId": "uuid",
  "connectionType": "Rivalry",
  "strength": "Strong",
  "title": "Derby Warszawy",
  "description": "Historic rivalry between Warsaw clubs"
}
```

### Graph Data Endpoint

#### Get Graph Visualization Data
```http
GET /api/graph-data
```

Returns optimized data for graph visualization:
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "uuid",
        "name": "Legia Warszawa",
        "shortName": "Legia",
        "league": "Ekstraklasa",
        "logoPath": "/uploads/logos/legia.svg",
        "position": { "x": 100, "y": 200 }
      }
    ],
    "edges": [
      {
        "id": "uuid",
        "source": "uuid",
        "target": "uuid",
        "type": "Rivalry",
        "strength": "Strong",
        "title": "Derby Warszawy"
      }
    ]
  }
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 500 | Internal Server Error |

## Rate Limiting

- **Public endpoints**: 100 requests per minute
- **Authenticated endpoints**: 1000 requests per minute
- **File upload**: 10 uploads per minute

## Validation Rules

### Club Validation
- `name`: Required, 2-100 characters
- `shortName`: Required, 2-20 characters
- `league`: Must be valid enum value
- `country`: Required, 2-50 characters
- `city`: Required, 2-50 characters
- `founded`: Optional, must be between 1850-current year
- `website`: Optional, must be valid URL

### Connection Validation
- `fromClubId`: Required, must exist
- `toClubId`: Required, must exist, cannot be same as fromClubId
- `connectionType`: Required, must be valid enum
- `strength`: Required, must be valid enum
- `title`: Required, 5-100 characters

## Examples

### JavaScript/TypeScript Example

```typescript
class PolishFootballNetworkAPI {
  private baseUrl = 'http://localhost:5000/api';
  private token: string | null = null;

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    if (result.success) {
      this.token = result.data.token;
    }
    return result;
  }

  async getClubs(page = 1, pageSize = 20) {
    const response = await fetch(
      `${this.baseUrl}/clubs?page=${page}&pageSize=${pageSize}`
    );
    return await response.json();
  }

  async createClub(clubData: any) {
    const response = await fetch(`${this.baseUrl}/admin/clubs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(clubData)
    });
    return await response.json();
  }
}
```

### Python Example

```python
import requests

class PolishFootballNetworkAPI:
    def __init__(self, base_url="http://localhost:5000/api"):
        self.base_url = base_url
        self.token = None
    
    def login(self, email, password):
        response = requests.post(f"{self.base_url}/auth/login", json={
            "email": email,
            "password": password
        })
        result = response.json()
        if result["success"]:
            self.token = result["data"]["token"]
        return result
    
    def get_clubs(self, page=1, page_size=20):
        response = requests.get(f"{self.base_url}/clubs", params={
            "page": page,
            "pageSize": page_size
        })
        return response.json()
    
    def create_club(self, club_data):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(f"{self.base_url}/admin/clubs", 
                               json=club_data, headers=headers)
        return response.json()
```

## Webhook Events (Future Feature)

The API will support webhooks for real-time notifications:

- `club.created`
- `club.updated`
- `club.deleted`
- `connection.created`
- `connection.updated`
- `connection.deleted`

## SDK Support

Official SDKs are planned for:
- JavaScript/TypeScript
- Python
- C#
- PHP

## Support

For API support, please:
1. Check this documentation
2. Review the OpenAPI specification at `/swagger`
3. Submit issues on GitHub
4. Contact the development team
