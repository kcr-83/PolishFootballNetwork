namespace PolishFootballNetwork.Application.Common.Models;

/// <summary>
/// Result of a file upload operation.
/// </summary>
public class FileUploadResult
{
    /// <summary>
    /// Gets or sets a value indicating whether the upload was successful.
    /// </summary>
    public bool IsSuccess { get; set; }

    /// <summary>
    /// Gets or sets the URL of the uploaded file.
    /// </summary>
    public string FileUrl { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the relative path of the uploaded file.
    /// </summary>
    public string FilePath { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the error message if the upload failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Creates a successful upload result.
    /// </summary>
    /// <param name="fileUrl">The URL of the uploaded file.</param>
    /// <param name="filePath">The relative path of the uploaded file.</param>
    /// <returns>A successful upload result.</returns>
    public static FileUploadResult Success(string fileUrl, string filePath)
    {
        return new FileUploadResult
        {
            IsSuccess = true,
            FileUrl = fileUrl,
            FilePath = filePath
        };
    }

    /// <summary>
    /// Creates a failed upload result.
    /// </summary>
    /// <param name="errorMessage">The error message.</param>
    /// <returns>A failed upload result.</returns>
    public static FileUploadResult Failure(string errorMessage)
    {
        return new FileUploadResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }
}

/// <summary>
/// Represents file information.
/// </summary>
public class FileInfo
{
    /// <summary>
    /// Gets or sets the file name.
    /// </summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the file size in bytes.
    /// </summary>
    public long Size { get; set; }

    /// <summary>
    /// Gets or sets the content type.
    /// </summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the creation date.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the last modified date.
    /// </summary>
    public DateTime ModifiedAt { get; set; }

    /// <summary>
    /// Gets or sets the file URL.
    /// </summary>
    public string Url { get; set; } = string.Empty;
}

/// <summary>
/// Represents a JWT token.
/// </summary>
public class JwtToken
{
    /// <summary>
    /// Gets or sets the token value.
    /// </summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the token expiration time.
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Gets or sets the refresh token.
    /// </summary>
    public string? RefreshToken { get; set; }

    /// <summary>
    /// Gets or sets the token type (usually "Bearer").
    /// </summary>
    public string TokenType { get; set; } = "Bearer";
}

/// <summary>
/// Result of token validation.
/// </summary>
public class TokenValidationResult
{
    /// <summary>
    /// Gets or sets a value indicating whether the token is valid.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// Gets or sets the user ID from the token.
    /// </summary>
    public int? UserId { get; set; }

    /// <summary>
    /// Gets or sets the user email from the token.
    /// </summary>
    public string? UserEmail { get; set; }

    /// <summary>
    /// Gets or sets the user roles from the token.
    /// </summary>
    public IReadOnlyList<string> Roles { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Gets or sets the token expiration time.
    /// </summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>
    /// Gets or sets the error message if validation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Creates a successful validation result.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="userEmail">The user email.</param>
    /// <param name="roles">The user roles.</param>
    /// <param name="expiresAt">The token expiration.</param>
    /// <returns>A successful validation result.</returns>
    public static TokenValidationResult Success(int userId, string userEmail, IReadOnlyList<string> roles, DateTime expiresAt)
    {
        return new TokenValidationResult
        {
            IsValid = true,
            UserId = userId,
            UserEmail = userEmail,
            Roles = roles,
            ExpiresAt = expiresAt
        };
    }

    /// <summary>
    /// Creates a failed validation result.
    /// </summary>
    /// <param name="errorMessage">The error message.</param>
    /// <returns>A failed validation result.</returns>
    public static TokenValidationResult Failure(string errorMessage)
    {
        return new TokenValidationResult
        {
            IsValid = false,
            ErrorMessage = errorMessage
        };
    }
}

/// <summary>
/// Represents file type categories.
/// </summary>
public enum FileType
{
    /// <summary>
    /// Image files (logos, photos, etc.).
    /// </summary>
    Image,

    /// <summary>
    /// Document files (PDFs, etc.).
    /// </summary>
    Document,

    /// <summary>
    /// Other file types.
    /// </summary>
    Other
}
