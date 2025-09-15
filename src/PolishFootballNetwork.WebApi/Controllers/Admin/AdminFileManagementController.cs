using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PolishFootballNetwork.Application.Features.FileManagement.DTOs;
using PolishFootballNetwork.Application.Common.Models;
using System.ComponentModel.DataAnnotations;

namespace PolishFootballNetwork.WebApi.Controllers.Admin;

/// <summary>
/// Admin file management controller for handling file uploads, processing, and management operations.
/// Provides comprehensive file handling including SVG processing, validation, cleanup, and storage management.
/// </summary>
[ApiController]
[Route("api/admin/files")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public class AdminFileManagementController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<AdminFileManagementController> _logger;

    private static readonly string[] AllowedImageExtensions = { ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp" };
    private static readonly string[] AllowedDocumentExtensions = { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt" };
    private const long MaxFileSizeBytes = 2 * 1024 * 1024; // 2MB
    private const long MaxDocumentSizeBytes = 10 * 1024 * 1024; // 10MB

    public AdminFileManagementController(IMediator mediator, ILogger<AdminFileManagementController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Upload and process image files (logos, avatars, etc.)
    /// </summary>
    /// <param name="file">Image file to upload</param>
    /// <param name="entityType">Entity type the file belongs to (Club, User, etc.)</param>
    /// <param name="entityId">Entity identifier</param>
    /// <param name="category">File category (Logo, Avatar, Banner, etc.)</param>
    /// <param name="generateThumbnail">Whether to generate thumbnail</param>
    /// <returns>Upload result with file information</returns>
    [HttpPost("images")]
    [ProducesResponseType(typeof(FileUploadResultDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status413PayloadTooLarge)]
    [RequestSizeLimit(MaxFileSizeBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxFileSizeBytes)]
    public async Task<ActionResult<FileUploadResultDto>> UploadImage(
        IFormFile file,
        [FromForm, Required] string entityType,
        [FromForm, Required] Guid entityId,
        [FromForm] string category = "General",
        [FromForm] bool generateThumbnail = false)
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file provided or file is empty" });
            }

            if (file.Length > MaxFileSizeBytes)
            {
                return StatusCode(413, new { message = $"File size exceeds maximum limit of {MaxFileSizeBytes / (1024 * 1024)}MB" });
            }

            var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedImageExtensions.Contains(fileExtension))
            {
                return BadRequest(new { 
                    message = $"Invalid file type. Allowed types: {string.Join(", ", AllowedImageExtensions)}" 
                });
            }

            // Validate entity type
            var validEntityTypes = new[] { "Club", "User", "Connection", "Event" };
            if (!validEntityTypes.Contains(entityType, StringComparer.OrdinalIgnoreCase))
            {
                return BadRequest(new { 
                    message = $"Invalid entity type. Allowed types: {string.Join(", ", validEntityTypes)}" 
                });
            }

            var command = new UploadImageCommand
            {
                File = file,
                EntityType = entityType,
                EntityId = entityId,
                Category = category,
                GenerateThumbnail = generateThumbnail,
                UploadedBy = User.Identity?.Name ?? "Admin"
            };

            var result = await _mediator.Send(command);
            
            _logger.LogInformation(
                "Image uploaded successfully with ID {FileId} for {EntityType} {EntityId} by admin user", 
                result.FileId, entityType, entityId);
            
            return CreatedAtAction(
                nameof(GetFileById), 
                new { id = result.FileId }, 
                result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Image upload failed - validation or processing error");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during image upload");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Upload and process document files
    /// </summary>
    /// <param name="file">Document file to upload</param>
    /// <param name="entityType">Entity type the file belongs to</param>
    /// <param name="entityId">Entity identifier</param>
    /// <param name="category">File category</param>
    /// <param name="description">File description</param>
    /// <param name="isPublic">Whether file is publicly accessible</param>
    /// <returns>Upload result with file information</returns>
    [HttpPost("documents")]
    [ProducesResponseType(typeof(FileUploadResultDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status413PayloadTooLarge)]
    [RequestSizeLimit(MaxDocumentSizeBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxDocumentSizeBytes)]
    public async Task<ActionResult<FileUploadResultDto>> UploadDocument(
        IFormFile file,
        [FromForm, Required] string entityType,
        [FromForm, Required] Guid entityId,
        [FromForm] string category = "Document",
        [FromForm] string? description = null,
        [FromForm] bool isPublic = false)
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file provided or file is empty" });
            }

            if (file.Length > MaxDocumentSizeBytes)
            {
                return StatusCode(413, new { message = $"File size exceeds maximum limit of {MaxDocumentSizeBytes / (1024 * 1024)}MB" });
            }

            var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedDocumentExtensions.Contains(fileExtension))
            {
                return BadRequest(new { 
                    message = $"Invalid file type. Allowed types: {string.Join(", ", AllowedDocumentExtensions)}" 
                });
            }

            var command = new UploadDocumentCommand
            {
                File = file,
                EntityType = entityType,
                EntityId = entityId,
                Category = category,
                Description = description,
                IsPublic = isPublic,
                UploadedBy = User.Identity?.Name ?? "Admin"
            };

            var result = await _mediator.Send(command);
            
            _logger.LogInformation(
                "Document uploaded successfully with ID {FileId} for {EntityType} {EntityId} by admin user", 
                result.FileId, entityType, entityId);
            
            return CreatedAtAction(
                nameof(GetFileById), 
                new { id = result.FileId }, 
                result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Document upload failed - validation or processing error");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during document upload");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get file information by ID
    /// </summary>
    /// <param name="id">File identifier</param>
    /// <returns>File information and metadata</returns>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(FileInfoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<FileInfoDto>> GetFileById(Guid id)
    {
        try
        {
            var query = new GetFileByIdQuery { FileId = id };
            var result = await _mediator.Send(query);

            if (result == null)
            {
                return NotFound(new { message = $"File with ID {id} not found" });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving file {FileId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Download file by ID
    /// </summary>
    /// <param name="id">File identifier</param>
    /// <param name="inline">Whether to display inline or as attachment</param>
    /// <returns>File content</returns>
    [HttpGet("{id:guid}/download")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DownloadFile(Guid id, [FromQuery] bool inline = false)
    {
        try
        {
            var query = new DownloadFileQuery { FileId = id };
            var result = await _mediator.Send(query);

            if (result == null)
            {
                return NotFound(new { message = $"File with ID {id} not found" });
            }

            var contentDisposition = inline ? "inline" : "attachment";
            Response.Headers.Add("Content-Disposition", $"{contentDisposition}; filename=\"{result.FileName}\"");

            _logger.LogInformation("File {FileId} downloaded by admin user", id);

            return File(result.Content, result.ContentType, result.FileName);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while downloading file {FileId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get paginated list of files with filtering options
    /// </summary>
    /// <param name="pageNumber">Page number (default: 1)</param>
    /// <param name="pageSize">Items per page (default: 20, max: 100)</param>
    /// <param name="entityType">Filter by entity type</param>
    /// <param name="entityId">Filter by entity ID</param>
    /// <param name="category">Filter by category</param>
    /// <param name="fileType">Filter by file type (Image, Document)</param>
    /// <param name="dateFrom">Filter files uploaded from this date</param>
    /// <param name="dateTo">Filter files uploaded to this date</param>
    /// <param name="searchTerm">Search in file name or description</param>
    /// <returns>Paginated list of files</returns>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<FileInfoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<FileInfoDto>>> GetFiles(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? entityType = null,
        [FromQuery] Guid? entityId = null,
        [FromQuery] string? category = null,
        [FromQuery] string? fileType = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] string? searchTerm = null)
    {
        try
        {
            if (pageSize > 100)
            {
                pageSize = 100;
            }

            if (dateFrom.HasValue && dateTo.HasValue && dateFrom > dateTo)
            {
                return BadRequest(new { message = "Date from cannot be greater than date to" });
            }

            var query = new GetFilesQuery
            {
                PageNumber = pageNumber,
                PageSize = pageSize,
                EntityType = entityType,
                EntityId = entityId,
                Category = category,
                FileType = fileType,
                DateFrom = dateFrom,
                DateTo = dateTo,
                SearchTerm = searchTerm
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for files query");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving files");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Delete a file
    /// </summary>
    /// <param name="id">File identifier</param>
    /// <param name="permanent">Whether to permanently delete or mark as deleted</param>
    /// <returns>Success confirmation</returns>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteFile(Guid id, [FromQuery] bool permanent = false)
    {
        try
        {
            var command = new DeleteFileCommand 
            { 
                FileId = id, 
                Permanent = permanent,
                DeletedBy = User.Identity?.Name ?? "Admin"
            };
            
            var result = await _mediator.Send(command);

            if (!result)
            {
                return NotFound(new { message = $"File with ID {id} not found" });
            }

            _logger.LogInformation("File {FileId} {DeleteType} by admin user", 
                id, permanent ? "permanently deleted" : "marked as deleted");
            
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "File deletion failed - business rule violation");
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while deleting file {FileId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Perform bulk operations on files
    /// </summary>
    /// <param name="request">Bulk operation request</param>
    /// <returns>Bulk operation results</returns>
    [HttpPost("bulk")]
    [ProducesResponseType(typeof(BulkFileOperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<BulkFileOperationResultDto>> BulkOperation([FromBody] BulkFileOperationDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (request.FileIds == null || !request.FileIds.Any())
            {
                return BadRequest(new { message = "No file IDs provided" });
            }

            if (request.FileIds.Count() > 50)
            {
                return BadRequest(new { message = "Cannot process more than 50 files at once" });
            }

            var command = new BulkFileOperationCommand
            {
                FileIds = request.FileIds,
                Operation = request.Operation,
                NewCategory = request.NewCategory,
                Permanent = request.Permanent,
                OperatedBy = User.Identity?.Name ?? "Admin"
            };

            var result = await _mediator.Send(command);
            
            _logger.LogInformation(
                "Bulk file operation {Operation} completed on {Count} files by admin user", 
                request.Operation, 
                request.FileIds.Count());
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid bulk file operation request");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during bulk file operation");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get file storage statistics
    /// </summary>
    /// <returns>Storage usage statistics</returns>
    [HttpGet("statistics")]
    [ProducesResponseType(typeof(FileStorageStatisticsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<FileStorageStatisticsDto>> GetStorageStatistics()
    {
        try
        {
            var query = new GetFileStorageStatisticsQuery();
            var result = await _mediator.Send(query);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving storage statistics");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Clean up orphaned and deleted files
    /// </summary>
    /// <param name="dryRun">Whether to perform a dry run without actual deletion</param>
    /// <param name="olderThanDays">Delete files older than specified days (default: 30)</param>
    /// <returns>Cleanup operation results</returns>
    [HttpPost("cleanup")]
    [ProducesResponseType(typeof(FileCleanupResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<FileCleanupResultDto>> CleanupFiles(
        [FromQuery] bool dryRun = true,
        [FromQuery] int olderThanDays = 30)
    {
        try
        {
            if (olderThanDays < 1)
            {
                return BadRequest(new { message = "olderThanDays must be at least 1" });
            }

            var command = new CleanupFilesCommand
            {
                DryRun = dryRun,
                OlderThanDays = olderThanDays,
                InitiatedBy = User.Identity?.Name ?? "Admin"
            };

            var result = await _mediator.Send(command);
            
            _logger.LogInformation(
                "File cleanup {Operation} completed by admin user - {FilesProcessed} files processed", 
                dryRun ? "dry run" : "operation",
                result.FilesProcessed);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during file cleanup");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Validate file before upload
    /// </summary>
    /// <param name="fileName">File name to validate</param>
    /// <param name="fileSize">File size in bytes</param>
    /// <param name="fileType">File type (Image, Document)</param>
    /// <returns>Validation results</returns>
    [HttpPost("validate")]
    [ProducesResponseType(typeof(FileValidationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<FileValidationDto>> ValidateFile(
        [FromBody] FileValidationRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var command = new ValidateFileCommand
            {
                FileName = request.FileName,
                FileSize = request.FileSize,
                FileType = request.FileType
            };

            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid file validation request");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during file validation");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }
}

// Placeholder command and query classes - these would be implemented in the Application layer
public record UploadImageCommand
{
    public IFormFile File { get; init; } = null!;
    public string EntityType { get; init; } = string.Empty;
    public Guid EntityId { get; init; }
    public string Category { get; init; } = string.Empty;
    public bool GenerateThumbnail { get; init; }
    public string UploadedBy { get; init; } = string.Empty;
}

public record UploadDocumentCommand
{
    public IFormFile File { get; init; } = null!;
    public string EntityType { get; init; } = string.Empty;
    public Guid EntityId { get; init; }
    public string Category { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsPublic { get; init; }
    public string UploadedBy { get; init; } = string.Empty;
}

public record GetFileByIdQuery
{
    public Guid FileId { get; init; }
}

public record DownloadFileQuery
{
    public Guid FileId { get; init; }
}

public record GetFilesQuery
{
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? EntityType { get; init; }
    public Guid? EntityId { get; init; }
    public string? Category { get; init; }
    public string? FileType { get; init; }
    public DateTime? DateFrom { get; init; }
    public DateTime? DateTo { get; init; }
    public string? SearchTerm { get; init; }
}

public record DeleteFileCommand
{
    public Guid FileId { get; init; }
    public bool Permanent { get; init; }
    public string DeletedBy { get; init; } = string.Empty;
}

public record BulkFileOperationCommand
{
    public IEnumerable<Guid> FileIds { get; init; } = Enumerable.Empty<Guid>();
    public BulkFileOperationType Operation { get; init; }
    public string? NewCategory { get; init; }
    public bool Permanent { get; init; }
    public string OperatedBy { get; init; } = string.Empty;
}

public record GetFileStorageStatisticsQuery;

public record CleanupFilesCommand
{
    public bool DryRun { get; init; } = true;
    public int OlderThanDays { get; init; } = 30;
    public string InitiatedBy { get; init; } = string.Empty;
}

public record ValidateFileCommand
{
    public string FileName { get; init; } = string.Empty;
    public long FileSize { get; init; }
    public string FileType { get; init; } = string.Empty;
}

public record FileValidationRequestDto
{
    [Required]
    public string FileName { get; init; } = string.Empty;
    
    [Required]
    [Range(1, long.MaxValue)]
    public long FileSize { get; init; }
    
    [Required]
    public string FileType { get; init; } = string.Empty;
}

public record FileDownloadResult
{
    public byte[] Content { get; init; } = Array.Empty<byte>();
    public string FileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
}

public enum BulkFileOperationType
{
    Delete,
    ChangeCategory,
    Archive,
    Restore
}