namespace PolishFootballNetwork.Application.Common.Models;

/// <summary>
/// File information for admin file management.
/// </summary>
public sealed class FileInfoDto
{
    /// <summary>
    /// Gets or sets the file ID.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Gets or sets the file path.
    /// </summary>
    public string FilePath { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the file name.
    /// </summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the original file name.
    /// </summary>
    public string OriginalFileName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the file size in bytes.
    /// </summary>
    public long FileSize { get; set; }

    /// <summary>
    /// Gets or sets the content type.
    /// </summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether the file is public.
    /// </summary>
    public bool IsPublic { get; set; }

    /// <summary>
    /// Gets or sets the category.
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Gets or sets the alt text.
    /// </summary>
    public string? AltText { get; set; }

    /// <summary>
    /// Gets or sets the description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the upload timestamp.
    /// </summary>
    public DateTime UploadedAt { get; set; }

    /// <summary>
    /// Gets or sets the user who uploaded the file.
    /// </summary>
    public string? UploadedBy { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the file is orphaned.
    /// </summary>
    public bool IsOrphaned { get; set; }

    /// <summary>
    /// Gets or sets the last accessed timestamp.
    /// </summary>
    public DateTime? LastAccessed { get; set; }

    /// <summary>
    /// Gets or sets the access count.
    /// </summary>
    public int AccessCount { get; set; }

    /// <summary>
    /// Gets or sets the thumbnail path.
    /// </summary>
    public string? ThumbnailPath { get; set; }
}