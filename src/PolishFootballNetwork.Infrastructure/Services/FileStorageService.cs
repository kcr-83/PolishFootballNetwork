using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Infrastructure.Configuration;
using FileInfo = PolishFootballNetwork.Application.Common.Models.FileInfo;

namespace PolishFootballNetwork.Infrastructure.Services;

/// <summary>
/// File storage service that handles file operations on the local file system.
/// </summary>
public class FileStorageService : IFileService
{
    private readonly FileStorageOptions options;
    private readonly ILogger<FileStorageService> logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="FileStorageService"/> class.
    /// </summary>
    /// <param name="options">File storage configuration options.</param>
    /// <param name="logger">Logger instance.</param>
    public FileStorageService(IOptions<FileStorageOptions> options, ILogger<FileStorageService> logger)
    {
        this.options = options.Value;
        this.logger = logger;

        // Ensure upload directory exists
        if (!Directory.Exists(this.options.UploadPath))
        {
            Directory.CreateDirectory(this.options.UploadPath);
            this.logger.LogInformation("Created upload directory: {UploadPath}", this.options.UploadPath);
        }
    }

    /// <summary>
    /// Uploads a file to the storage system.
    /// </summary>
    /// <param name="filePath">The relative path where the file should be stored.</param>
    /// <param name="content">The file content as a byte array.</param>
    /// <param name="contentType">The MIME type of the file.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The file upload result.</returns>
    public async Task<FileUploadResult> UploadFileAsync(string filePath, byte[] content, string contentType, CancellationToken cancellationToken = default)
    {
        try
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(filePath);
            ArgumentNullException.ThrowIfNull(content);

            if (content.Length == 0)
            {
                return FileUploadResult.Failure("File content cannot be empty.");
            }

            if (content.Length > this.options.MaxFileSizeInBytes)
            {
                return FileUploadResult.Failure($"File size exceeds maximum allowed size of {this.options.MaxFileSizeInBytes} bytes.");
            }

            var fileName = Path.GetFileName(filePath);
            var fileExtension = Path.GetExtension(fileName).ToLowerInvariant();

            if (this.options.AllowedExtensions.Count > 0 && !this.options.AllowedExtensions.Contains(fileExtension))
            {
                return FileUploadResult.Failure($"File extension '{fileExtension}' is not allowed.");
            }

            var sanitizedFileName = FileStorageService.SanitizeFileName(fileName);
            var uniqueFileName = FileStorageService.GenerateUniqueFileName(sanitizedFileName);
            var fullPath = Path.Combine(this.options.UploadPath, uniqueFileName);

            // Ensure directory exists
            var directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            await File.WriteAllBytesAsync(fullPath, content, cancellationToken);

            var fileUrl = this.GenerateFileUrl(uniqueFileName);
            var relativeFilePath = Path.GetRelativePath(this.options.UploadPath, fullPath);

            this.logger.LogInformation("File uploaded successfully: {FileName} (Size: {Size} bytes)",
                sanitizedFileName, content.Length);

            return FileUploadResult.Success(fileUrl, relativeFilePath);
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Failed to upload file: {FilePath}", filePath);
            return FileUploadResult.Failure($"Upload failed: {ex.Message}");
        }
    }

    /// <summary>
    /// Deletes a file from the storage system.
    /// </summary>
    /// <param name="fileUrl">The URL or path of the file to delete.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the delete operation.</returns>
    public async Task DeleteFileAsync(string fileUrl, CancellationToken cancellationToken = default)
    {
        await Task.CompletedTask; // Make async for future extensibility

        try
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(fileUrl);

            var fileName = this.ExtractFileNameFromUrl(fileUrl);
            var filePath = Path.Combine(this.options.UploadPath, fileName);

            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                this.logger.LogInformation("File deleted successfully: {FileUrl}", fileUrl);
            }
            else
            {
                this.logger.LogWarning("File not found for deletion: {FileUrl}", fileUrl);
            }
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Failed to delete file: {FileUrl}", fileUrl);
            throw;
        }
    }

    /// <summary>
    /// Gets the file information.
    /// </summary>
    /// <param name="fileUrl">The URL or path of the file.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The file information or null if not found.</returns>
    public async Task<FileInfo?> GetFileInfoAsync(string fileUrl, CancellationToken cancellationToken = default)
    {
        await Task.CompletedTask; // Make async for future extensibility

        try
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(fileUrl);

            var fileName = this.ExtractFileNameFromUrl(fileUrl);
            var filePath = Path.Combine(this.options.UploadPath, fileName);

            if (!File.Exists(filePath))
            {
                return null;
            }

            var fileInfo = new System.IO.FileInfo(filePath);
            var fileExtension = Path.GetExtension(fileName).ToLowerInvariant();

            return new FileInfo
            {
                FileName = Path.GetFileName(fileName),
                Size = fileInfo.Length,
                ContentType = this.GetContentType(fileExtension),
                CreatedAt = fileInfo.CreationTimeUtc,
                ModifiedAt = fileInfo.LastWriteTimeUtc,
                Url = fileUrl
            };
        }
        catch (Exception ex)
        {
            this.logger.LogError(ex, "Failed to get file info: {FileUrl}", fileUrl);
            throw;
        }
    }

    /// <summary>
    /// Validates if the file type is allowed.
    /// </summary>
    /// <param name="fileName">The file name.</param>
    /// <param name="contentType">The MIME type.</param>
    /// <param name="allowedTypes">The allowed file types.</param>
    /// <returns>True if the file type is allowed.</returns>
    public bool IsFileTypeAllowed(string fileName, string contentType, IReadOnlyList<string> allowedTypes)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(fileName);
        ArgumentException.ThrowIfNullOrWhiteSpace(contentType);
        ArgumentNullException.ThrowIfNull(allowedTypes);

        var fileExtension = Path.GetExtension(fileName).ToLowerInvariant();

        // Check both extension and content type
        return allowedTypes.Contains(fileExtension) || allowedTypes.Contains(contentType);
    }

    /// <summary>
    /// Gets the file size limit for a specific file type.
    /// </summary>
    /// <param name="fileType">The file type category.</param>
    /// <returns>The maximum file size in bytes.</returns>
    public long GetMaxFileSize(FileType fileType)
    {
        return fileType switch
        {
            FileType.Image => this.options.MaxFileSizeInBytes,
            FileType.Document => this.options.MaxFileSizeInBytes * 2, // Allow larger documents
            FileType.Other => this.options.MaxFileSizeInBytes / 2, // Smaller limit for other files
            _ => this.options.MaxFileSizeInBytes
        };
    }

    private static string GenerateUniqueFileName(string originalFileName)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var fileExtension = Path.GetExtension(originalFileName);
        var nameWithoutExtension = Path.GetFileNameWithoutExtension(originalFileName);

        return $"{nameWithoutExtension}_{timestamp}_{Guid.NewGuid():N[..8]}{fileExtension}";
    }

    private string GenerateFileUrl(string fileName)
    {
        if (!string.IsNullOrEmpty(this.options.BaseUrl))
        {
            return $"{this.options.BaseUrl.TrimEnd('/')}/files/{fileName}";
        }

        return $"/files/{fileName}";
    }

    private static string ExtractFileNameFromUrl(string fileUrl)
    {
        // Extract filename from URL (e.g., "/files/filename.jpg" -> "filename.jpg")
        var uri = new Uri(fileUrl, UriKind.RelativeOrAbsolute);
        return Path.GetFileName(uri.LocalPath);
    }

    private static string GetContentType(string fileExtension)
    {
        return fileExtension.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".bmp" => "image/bmp",
            ".svg" => "image/svg+xml",
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".txt" => "text/plain",
            ".xml" => "application/xml",
            ".json" => "application/json",
            ".zip" => "application/zip",
            _ => "application/octet-stream"
        };
    }

    private static string SanitizeFileName(string fileName)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        var sanitized = new string(fileName.Where(c => !invalidChars.Contains(c)).ToArray());

        // Ensure we have a valid filename
        if (string.IsNullOrWhiteSpace(sanitized))
        {
            sanitized = "unnamed_file";
        }

        // Limit length
        if (sanitized.Length > 100)
        {
            var extension = Path.GetExtension(sanitized);
            var nameWithoutExtension = Path.GetFileNameWithoutExtension(sanitized);
            sanitized = nameWithoutExtension[..(100 - extension.Length)] + extension;
        }

        return sanitized;
    }
}