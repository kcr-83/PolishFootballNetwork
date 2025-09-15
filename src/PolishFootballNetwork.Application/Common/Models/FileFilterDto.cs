namespace PolishFootballNetwork.Application.Common.Models;

/// <summary>
/// File management filter options.
/// </summary>
public sealed class FileFilterDto
{
    /// <summary>
    /// Gets or sets the content type filter.
    /// </summary>
    public string? ContentType { get; set; }

    /// <summary>
    /// Gets or sets the category filter.
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Gets or sets the public status filter.
    /// </summary>
    public bool? IsPublic { get; set; }

    /// <summary>
    /// Gets or sets the orphaned status filter.
    /// </summary>
    public bool? IsOrphaned { get; set; }

    /// <summary>
    /// Gets or sets the uploaded after date filter.
    /// </summary>
    public DateTime? UploadedAfter { get; set; }

    /// <summary>
    /// Gets or sets the uploaded before date filter.
    /// </summary>
    public DateTime? UploadedBefore { get; set; }

    /// <summary>
    /// Gets or sets the minimum file size filter.
    /// </summary>
    public long? MinSize { get; set; }

    /// <summary>
    /// Gets or sets the maximum file size filter.
    /// </summary>
    public long? MaxSize { get; set; }

    /// <summary>
    /// Gets or sets the uploaded by user filter.
    /// </summary>
    public string? UploadedBy { get; set; }
}