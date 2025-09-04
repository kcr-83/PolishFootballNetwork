namespace PolishFootballNetwork.Domain.Entities;

using PolishFootballNetwork.Domain.Common;
using PolishFootballNetwork.Domain.Enums;
using PolishFootballNetwork.Domain.Exceptions;

/// <summary>
/// Represents a file uploaded to the Polish Football Network system.
/// Contains file metadata, storage information, and ownership details.
/// </summary>
public class File : Entity
{
    /// <summary>
    /// Gets the original name of the file as uploaded by the user.
    /// </summary>
    public string OriginalFileName { get; private set; }

    /// <summary>
    /// Gets the stored name of the file in the file system.
    /// </summary>
    public string StoredFileName { get; private set; }

    /// <summary>
    /// Gets the file path where the file is stored.
    /// </summary>
    public string FilePath { get; private set; }

    /// <summary>
    /// Gets the MIME type of the file.
    /// </summary>
    public string MimeType { get; private set; }

    /// <summary>
    /// Gets the size of the file in bytes.
    /// </summary>
    public long SizeInBytes { get; private set; }

    /// <summary>
    /// Gets the type category of the file.
    /// </summary>
    public FileType FileType { get; private set; }

    /// <summary>
    /// Gets the identifier of the user who uploaded the file.
    /// </summary>
    public int UploadedByUserId { get; private set; }

    /// <summary>
    /// Gets the identifier of the associated entity (if any).
    /// </summary>
    public int? EntityId { get; private set; }

    /// <summary>
    /// Gets the type of the associated entity (if any).
    /// </summary>
    public string? EntityType { get; private set; }

    /// <summary>
    /// Gets or sets the description of the file.
    /// </summary>
    public string? Description { get; private set; }

    /// <summary>
    /// Gets or sets additional tags associated with the file.
    /// </summary>
    public string? Tags { get; private set; }

    /// <summary>
    /// Gets the alternative text for accessibility.
    /// </summary>
    public string? AlternativeText { get; private set; }

    /// <summary>
    /// Gets the thumbnail path for image files.
    /// </summary>
    public string? ThumbnailPath { get; private set; }

    /// <summary>
    /// Gets a value indicating whether the file is publicly accessible.
    /// </summary>
    public bool IsPublic { get; private set; }

    /// <summary>
    /// Gets the checksum (hash) of the file for integrity verification.
    /// </summary>
    public string? Checksum { get; private set; }

    /// <summary>
    /// Gets the number of times the file has been downloaded.
    /// </summary>
    public int DownloadCount { get; private set; }

    /// <summary>
    /// Gets the date and time when the file was last accessed.
    /// </summary>
    public DateTime? LastAccessedAt { get; private set; }

    /// <summary>
    /// Gets the file metadata as JSON.
    /// </summary>
    public string? Metadata { get; private set; }

    /// <summary>
    /// Gets the user who uploaded the file (navigation property).
    /// </summary>
    public User? UploadedByUser { get; private set; }

    /// <summary>
    /// Gets the file extension from the original filename.
    /// </summary>
    public string FileExtension => Path.GetExtension(OriginalFileName);

    /// <summary>
    /// Gets the file size in a human-readable format.
    /// </summary>
    public string FormattedFileSize => FormatFileSize(SizeInBytes);

    /// <summary>
    /// Initializes a new instance of the File class. Used by EF Core.
    /// </summary>
    private File() : base()
    {
        OriginalFileName = string.Empty;
        StoredFileName = string.Empty;
        FilePath = string.Empty;
        MimeType = string.Empty;
    }

    /// <summary>
    /// Initializes a new instance of the File class with the specified parameters.
    /// </summary>
    /// <param name="originalFileName">The original name of the file.</param>
    /// <param name="storedFileName">The stored name of the file.</param>
    /// <param name="filePath">The file path where the file is stored.</param>
    /// <param name="mimeType">The MIME type of the file.</param>
    /// <param name="sizeInBytes">The size of the file in bytes.</param>
    /// <param name="fileType">The type category of the file.</param>
    /// <param name="uploadedByUserId">The identifier of the user who uploaded the file.</param>
    /// <exception cref="BusinessRuleValidationException">Thrown when validation fails.</exception>
    public File(string originalFileName, string storedFileName, string filePath, 
        string mimeType, long sizeInBytes, FileType fileType, int uploadedByUserId)
    {
        SetOriginalFileName(originalFileName);
        SetStoredFileName(storedFileName);
        SetFilePath(filePath);
        SetMimeType(mimeType);
        SetSizeInBytes(sizeInBytes);
        FileType = fileType;
        SetUploadedByUserId(uploadedByUserId);
        IsPublic = false; // Default to private
    }

    /// <summary>
    /// Updates the description of the file.
    /// </summary>
    /// <param name="description">The new description for the file.</param>
    public void UpdateDescription(string? description)
    {
        if (Description != description)
        {
            Description = description;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Updates the tags associated with the file.
    /// </summary>
    /// <param name="tags">The new tags for the file.</param>
    public void UpdateTags(string? tags)
    {
        if (Tags != tags)
        {
            Tags = tags;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Sets the file as publicly accessible.
    /// </summary>
    public void MakePublic()
    {
        if (!IsPublic)
        {
            IsPublic = true;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Sets the file as private (not publicly accessible).
    /// </summary>
    public void MakePrivate()
    {
        if (IsPublic)
        {
            IsPublic = false;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Updates the checksum of the file.
    /// </summary>
    /// <param name="checksum">The new checksum for the file.</param>
    public void UpdateChecksum(string? checksum)
    {
        if (Checksum != checksum)
        {
            Checksum = checksum;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Updates the entity association of the file.
    /// </summary>
    /// <param name="entityId">The identifier of the associated entity.</param>
    /// <param name="entityType">The type of the associated entity.</param>
    public void UpdateEntityAssociation(int? entityId, string? entityType)
    {
        if (EntityId != entityId || EntityType != entityType)
        {
            EntityId = entityId;
            EntityType = entityType;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Updates the alternative text of the file.
    /// </summary>
    /// <param name="alternativeText">The new alternative text.</param>
    public void UpdateAlternativeText(string? alternativeText)
    {
        if (AlternativeText != alternativeText)
        {
            AlternativeText = alternativeText;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Updates the thumbnail path of the file.
    /// </summary>
    /// <param name="thumbnailPath">The new thumbnail path.</param>
    public void UpdateThumbnailPath(string? thumbnailPath)
    {
        if (ThumbnailPath != thumbnailPath)
        {
            ThumbnailPath = thumbnailPath;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Updates the metadata of the file.
    /// </summary>
    /// <param name="metadata">The new metadata as JSON.</param>
    public void UpdateMetadata(string? metadata)
    {
        if (Metadata != metadata)
        {
            Metadata = metadata;
            UpdateModifiedAt();
        }
    }

    /// <summary>
    /// Records a download event for the file.
    /// </summary>
    public void RecordDownload()
    {
        DownloadCount++;
        LastAccessedAt = DateTime.UtcNow;
        UpdateModifiedAt();
    }

    /// <summary>
    /// Records an access event for the file.
    /// </summary>
    public void RecordAccess()
    {
        LastAccessedAt = DateTime.UtcNow;
        UpdateModifiedAt();
    }

    /// <summary>
    /// Determines if the file is an image based on its MIME type.
    /// </summary>
    /// <returns>true if the file is an image; otherwise, false.</returns>
    public bool IsImage()
    {
        return FileType == FileType.Image || 
               MimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Determines if the file is a document based on its MIME type.
    /// </summary>
    /// <returns>true if the file is a document; otherwise, false.</returns>
    public bool IsDocument()
    {
        return FileType == FileType.Document ||
               MimeType.StartsWith("application/", StringComparison.OrdinalIgnoreCase) ||
               MimeType.StartsWith("text/", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Determines if the file is a video based on its MIME type.
    /// </summary>
    /// <returns>true if the file is a video; otherwise, false.</returns>
    public bool IsVideo()
    {
        return FileType == FileType.Video ||
               MimeType.StartsWith("video/", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Determines if the file is an audio file based on its MIME type.
    /// </summary>
    /// <returns>true if the file is an audio file; otherwise, false.</returns>
    public bool IsAudio()
    {
        return FileType == FileType.Audio ||
               MimeType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Determines if the file size exceeds the specified limit.
    /// </summary>
    /// <param name="limitInBytes">The size limit in bytes.</param>
    /// <returns>true if the file exceeds the limit; otherwise, false.</returns>
    public bool ExceedsSizeLimit(long limitInBytes)
    {
        return SizeInBytes > limitInBytes;
    }

    /// <summary>
    /// Gets a list of individual tags from the Tags property.
    /// </summary>
    /// <returns>A list of individual tags, or an empty list if no tags are set.</returns>
    public List<string> GetTagList()
    {
        if (string.IsNullOrWhiteSpace(Tags))
            return new List<string>();

        return Tags.Split(',', StringSplitOptions.RemoveEmptyEntries)
                  .Select(tag => tag.Trim())
                  .Where(tag => !string.IsNullOrEmpty(tag))
                  .ToList();
    }

    /// <summary>
    /// Verifies the integrity of the file using the stored checksum.
    /// </summary>
    /// <param name="actualChecksum">The actual checksum of the file.</param>
    /// <returns>true if the checksums match; otherwise, false.</returns>
    public bool VerifyIntegrity(string actualChecksum)
    {
        if (string.IsNullOrEmpty(Checksum) || string.IsNullOrEmpty(actualChecksum))
            return false;

        return string.Equals(Checksum, actualChecksum, StringComparison.OrdinalIgnoreCase);
    }

    private void SetOriginalFileName(string originalFileName)
    {
        if (string.IsNullOrWhiteSpace(originalFileName))
            throw new BusinessRuleValidationException("Original file name cannot be empty.", nameof(OriginalFileName));

        if (originalFileName.Length > 255)
            throw new BusinessRuleValidationException("Original file name cannot exceed 255 characters.", nameof(OriginalFileName));

        OriginalFileName = originalFileName.Trim();
    }

    private void SetStoredFileName(string storedFileName)
    {
        if (string.IsNullOrWhiteSpace(storedFileName))
            throw new BusinessRuleValidationException("Stored file name cannot be empty.", nameof(StoredFileName));

        if (storedFileName.Length > 255)
            throw new BusinessRuleValidationException("Stored file name cannot exceed 255 characters.", nameof(StoredFileName));

        StoredFileName = storedFileName.Trim();
    }

    private void SetFilePath(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath))
            throw new BusinessRuleValidationException("File path cannot be empty.", nameof(FilePath));

        if (filePath.Length > 500)
            throw new BusinessRuleValidationException("File path cannot exceed 500 characters.", nameof(FilePath));

        FilePath = filePath.Trim();
    }

    private void SetMimeType(string mimeType)
    {
        if (string.IsNullOrWhiteSpace(mimeType))
            throw new BusinessRuleValidationException("MIME type cannot be empty.", nameof(MimeType));

        if (mimeType.Length > 100)
            throw new BusinessRuleValidationException("MIME type cannot exceed 100 characters.", nameof(MimeType));

        MimeType = mimeType.Trim().ToLowerInvariant();
    }

    private void SetSizeInBytes(long sizeInBytes)
    {
        if (sizeInBytes < 0)
            throw new BusinessRuleValidationException("File size cannot be negative.", nameof(SizeInBytes));

        if (sizeInBytes == 0)
            throw new BusinessRuleValidationException("File size cannot be zero.", nameof(SizeInBytes));

        // Set a reasonable maximum file size (100 MB)
        if (sizeInBytes > 100 * 1024 * 1024)
            throw new BusinessRuleValidationException("File size cannot exceed 100 MB.", nameof(SizeInBytes));

        SizeInBytes = sizeInBytes;
    }

    private void SetUploadedByUserId(int uploadedByUserId)
    {
        if (uploadedByUserId <= 0)
            throw new BusinessRuleValidationException("Uploaded by user ID must be positive.", nameof(UploadedByUserId));

        UploadedByUserId = uploadedByUserId;
    }

    private static string FormatFileSize(long bytes)
    {
        const long KB = 1024;
        const long MB = KB * 1024;
        const long GB = MB * 1024;

        return bytes switch
        {
            >= GB => $"{bytes / (double)GB:F2} GB",
            >= MB => $"{bytes / (double)MB:F2} MB",
            >= KB => $"{bytes / (double)KB:F2} KB",
            _ => $"{bytes} bytes"
        };
    }
}
