namespace PolishFootballNetwork.Infrastructure.Configuration;

/// <summary>
/// Configuration options for file storage service.
/// </summary>
public class FileStorageOptions
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "FileStorage";

    /// <summary>
    /// Gets or sets the upload path where files will be stored.
    /// </summary>
    public string UploadPath { get; set; } = "uploads";

    /// <summary>
    /// Gets or sets the maximum file size in bytes.
    /// </summary>
    public long MaxFileSizeInBytes { get; set; } = 10 * 1024 * 1024; // 10 MB

    /// <summary>
    /// Gets or sets the allowed file extensions.
    /// </summary>
    public HashSet<string> AllowedExtensions { get; set; } = new()
    {
        ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg",
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"
    };

    /// <summary>
    /// Gets or sets a value indicating whether to preserve original file names.
    /// </summary>
    public bool PreserveOriginalFileName { get; set; } = false;

    /// <summary>
    /// Gets or sets the base URL for file access (if serving files via web).
    /// </summary>
    public string? BaseUrl { get; set; }
}