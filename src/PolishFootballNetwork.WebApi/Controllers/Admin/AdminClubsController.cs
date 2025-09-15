using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PolishFootballNetwork.Application.Features.Clubs.DTOs.Admin;
using PolishFootballNetwork.Application.Features.Dashboard.DTOs.Admin;
using PolishFootballNetwork.Application.Common.Models;
using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.WebApi.Controllers.Admin;

/// <summary>
/// Admin controller for comprehensive club management operations.
/// Provides CRUD operations, logo upload, bulk operations, and advanced club management features.
/// </summary>
[ApiController]
[Route("api/admin/clubs")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public class AdminClubsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<AdminClubsController> _logger;

    public AdminClubsController(IMediator mediator, ILogger<AdminClubsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Get paginated list of clubs with admin-level details and filtering
    /// </summary>
    /// <param name="pageNumber">Page number (default: 1)</param>
    /// <param name="pageSize">Items per page (default: 10, max: 100)</param>
    /// <param name="searchTerm">Search in club name, city, or short name</param>
    /// <param name="league">Filter by league type</param>
    /// <param name="foundedAfter">Filter clubs founded after this year</param>
    /// <param name="foundedBefore">Filter clubs founded before this year</param>
    /// <param name="hasLogo">Filter clubs by logo presence</param>
    /// <param name="isActive">Filter by active status</param>
    /// <param name="sortBy">Sort field (Name, FoundedYear, City, CreatedAt)</param>
    /// <param name="sortDirection">Sort direction (Asc, Desc)</param>
    /// <returns>Paginated list of clubs with admin details</returns>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AdminClubDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<AdminClubDto>>> GetClubs(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? searchTerm = null,
        [FromQuery] LeagueType? league = null,
        [FromQuery] int? foundedAfter = null,
        [FromQuery] int? foundedBefore = null,
        [FromQuery] bool? hasLogo = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] string sortBy = "Name",
        [FromQuery] string sortDirection = "Asc")
    {
        try
        {
            if (pageSize > 100)
            {
                pageSize = 100;
            }

            var query = new GetAdminClubsQuery
            {
                PageNumber = pageNumber,
                PageSize = pageSize,
                SearchTerm = searchTerm,
                League = league,
                FoundedAfter = foundedAfter,
                FoundedBefore = foundedBefore,
                HasLogo = hasLogo,
                IsActive = isActive,
                SortBy = sortBy,
                SortDirection = sortDirection
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid parameters for admin clubs query");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving admin clubs");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get detailed information about a specific club (admin view)
    /// </summary>
    /// <param name="id">Club identifier</param>
    /// <returns>Detailed club information with admin data</returns>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AdminClubDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AdminClubDto>> GetClubById(Guid id)
    {
        try
        {
            var query = new GetAdminClubByIdQuery { ClubId = id };
            var result = await _mediator.Send(query);

            if (result == null)
            {
                return NotFound(new { message = $"Club with ID {id} not found" });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving club {ClubId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Create a new club with comprehensive validation
    /// </summary>
    /// <param name="request">Club creation data</param>
    /// <returns>Created club with admin details</returns>
    [HttpPost]
    [ProducesResponseType(typeof(AdminClubDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminClubDto>> CreateClub([FromBody] CreateClubDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var command = new CreateAdminClubCommand
            {
                Name = request.Name,
                ShortName = request.ShortName,
                City = request.City,
                FoundedYear = request.FoundedYear,
                StadiumName = request.StadiumName,
                StadiumCapacity = request.StadiumCapacity,
                Description = request.Description,
                Website = request.Website,
                League = request.League,
                IsActive = request.IsActive,
                AdminNotes = request.AdminNotes
            };

            var result = await _mediator.Send(command);
            
            _logger.LogInformation("Club created successfully with ID {ClubId} by admin user", result.Id);
            
            return CreatedAtAction(
                nameof(GetClubById), 
                new { id = result.Id }, 
                result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Club creation failed - conflict or business rule violation");
            return Conflict(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid data provided for club creation");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while creating club");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Update an existing club with comprehensive validation
    /// </summary>
    /// <param name="id">Club identifier</param>
    /// <param name="request">Club update data</param>
    /// <returns>Updated club with admin details</returns>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(AdminClubDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminClubDto>> UpdateClub(Guid id, [FromBody] UpdateClubDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var command = new UpdateAdminClubCommand
            {
                ClubId = id,
                Name = request.Name,
                ShortName = request.ShortName,
                City = request.City,
                FoundedYear = request.FoundedYear,
                StadiumName = request.StadiumName,
                StadiumCapacity = request.StadiumCapacity,
                Description = request.Description,
                Website = request.Website,
                League = request.League,
                IsActive = request.IsActive,
                AdminNotes = request.AdminNotes
            };

            var result = await _mediator.Send(command);

            if (result == null)
            {
                return NotFound(new { message = $"Club with ID {id} not found" });
            }

            _logger.LogInformation("Club {ClubId} updated successfully by admin user", id);
            
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Club update failed - conflict or business rule violation");
            return Conflict(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid data provided for club update");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while updating club {ClubId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Soft delete a club (admin operation)
    /// </summary>
    /// <param name="id">Club identifier</param>
    /// <returns>Success confirmation</returns>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteClub(Guid id)
    {
        try
        {
            var command = new DeleteAdminClubCommand { ClubId = id };
            var result = await _mediator.Send(command);

            if (!result)
            {
                return NotFound(new { message = $"Club with ID {id} not found" });
            }

            _logger.LogInformation("Club {ClubId} deleted successfully by admin user", id);
            
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Club deletion failed - business rule violation");
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while deleting club {ClubId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Upload or update club logo
    /// </summary>
    /// <param name="id">Club identifier</param>
    /// <param name="logoFile">Logo file (SVG, PNG, JPG - max 2MB)</param>
    /// <returns>Logo upload result with URL</returns>
    [HttpPost("{id:guid}/logo")]
    [ProducesResponseType(typeof(LogoUploadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status413PayloadTooLarge)]
    public async Task<ActionResult<LogoUploadResponseDto>> UploadLogo(Guid id, IFormFile logoFile)
    {
        try
        {
            if (logoFile == null || logoFile.Length == 0)
            {
                return BadRequest(new { message = "No file provided" });
            }

            // Validate file size (2MB limit)
            if (logoFile.Length > 2 * 1024 * 1024)
            {
                return StatusCode(413, new { message = "File size exceeds 2MB limit" });
            }

            // Validate file type
            var allowedTypes = new[] { "image/svg+xml", "image/png", "image/jpeg", "image/jpg" };
            if (!allowedTypes.Contains(logoFile.ContentType.ToLower()))
            {
                return BadRequest(new { message = "Only SVG, PNG, and JPG files are allowed" });
            }

            // Convert to byte array for application layer
            using var memoryStream = new MemoryStream();
            await logoFile.CopyToAsync(memoryStream);
            var fileBytes = memoryStream.ToArray();

            var command = new UploadClubLogoCommand
            {
                ClubId = id,
                FileName = logoFile.FileName,
                ContentType = logoFile.ContentType,
                FileData = fileBytes
            };

            var result = await _mediator.Send(command);

            if (result == null)
            {
                return NotFound(new { message = $"Club with ID {id} not found" });
            }

            _logger.LogInformation("Logo uploaded successfully for club {ClubId}", id);
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid file provided for logo upload");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while uploading logo for club {ClubId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Delete club logo
    /// </summary>
    /// <param name="id">Club identifier</param>
    /// <returns>Success confirmation</returns>
    [HttpDelete("{id:guid}/logo")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DeleteLogo(Guid id)
    {
        try
        {
            var command = new DeleteClubLogoCommand { ClubId = id };
            var result = await _mediator.Send(command);

            if (!result)
            {
                return NotFound(new { message = $"Club with ID {id} not found or no logo to delete" });
            }

            _logger.LogInformation("Logo deleted successfully for club {ClubId}", id);
            
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while deleting logo for club {ClubId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Perform bulk operations on multiple clubs
    /// </summary>
    /// <param name="request">Bulk operation request</param>
    /// <returns>Bulk operation results</returns>
    [HttpPost("bulk")]
    [ProducesResponseType(typeof(BulkClubOperationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<BulkClubOperationResultDto>> BulkOperation([FromBody] BulkClubOperationDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (request.ClubIds == null || !request.ClubIds.Any())
            {
                return BadRequest(new { message = "No club IDs provided" });
            }

            if (request.ClubIds.Count() > 100)
            {
                return BadRequest(new { message = "Cannot process more than 100 clubs at once" });
            }

            var command = new BulkClubOperationCommand
            {
                ClubIds = request.ClubIds,
                Operation = request.Operation,
                Parameters = request.Parameters
            };

            var result = await _mediator.Send(command);
            
            _logger.LogInformation(
                "Bulk operation {Operation} completed on {Count} clubs by admin user", 
                request.Operation, 
                request.ClubIds.Count());
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid bulk operation request");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during bulk club operation");
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Get audit log for a specific club
    /// </summary>
    /// <param name="id">Club identifier</param>
    /// <param name="pageNumber">Page number (default: 1)</param>
    /// <param name="pageSize">Items per page (default: 20, max: 100)</param>
    /// <returns>Paginated audit log entries</returns>
    [HttpGet("{id:guid}/audit")]
    [ProducesResponseType(typeof(PagedResult<ActivityLogDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<ActivityLogDto>>> GetClubAuditLog(
        Guid id,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            if (pageSize > 100)
            {
                pageSize = 100;
            }

            var query = new GetClubAuditLogQuery
            {
                ClubId = id,
                PageNumber = pageNumber,
                PageSize = pageSize
            };

            var result = await _mediator.Send(query);

            if (result.Items == null || !result.Items.Any())
            {
                // Check if club exists
                var clubQuery = new GetAdminClubByIdQuery { ClubId = id };
                var club = await _mediator.Send(clubQuery);
                
                if (club == null)
                {
                    return NotFound(new { message = $"Club with ID {id} not found" });
                }
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while retrieving audit log for club {ClubId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }

    /// <summary>
    /// Restore a soft-deleted club
    /// </summary>
    /// <param name="id">Club identifier</param>
    /// <returns>Restored club with admin details</returns>
    [HttpPost("{id:guid}/restore")]
    [ProducesResponseType(typeof(AdminClubDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminClubDto>> RestoreClub(Guid id)
    {
        try
        {
            var command = new RestoreClubCommand { ClubId = id };
            var result = await _mediator.Send(command);

            if (result == null)
            {
                return NotFound(new { message = $"Club with ID {id} not found or not deleted" });
            }

            _logger.LogInformation("Club {ClubId} restored successfully by admin user", id);
            
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Club restoration failed - business rule violation");
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while restoring club {ClubId}", id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }
    }
}

// Placeholder command and query classes - these would be implemented in the Application layer
public record GetAdminClubsQuery
{
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 10;
    public string? SearchTerm { get; init; }
    public LeagueType? League { get; init; }
    public int? FoundedAfter { get; init; }
    public int? FoundedBefore { get; init; }
    public bool? HasLogo { get; init; }
    public bool? IsActive { get; init; }
    public string SortBy { get; init; } = "Name";
    public string SortDirection { get; init; } = "Asc";
}

public record GetAdminClubByIdQuery
{
    public Guid ClubId { get; init; }
}

public record CreateAdminClubCommand
{
    public string Name { get; init; } = string.Empty;
    public string ShortName { get; init; } = string.Empty;
    public string City { get; init; } = string.Empty;
    public int FoundedYear { get; init; }
    public string? StadiumName { get; init; }
    public int? StadiumCapacity { get; init; }
    public string? Description { get; init; }
    public string? Website { get; init; }
    public LeagueType League { get; init; }
    public bool IsActive { get; init; } = true;
    public string? AdminNotes { get; init; }
}

public record UpdateAdminClubCommand
{
    public Guid ClubId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string ShortName { get; init; } = string.Empty;
    public string City { get; init; } = string.Empty;
    public int FoundedYear { get; init; }
    public string? StadiumName { get; init; }
    public int? StadiumCapacity { get; init; }
    public string? Description { get; init; }
    public string? Website { get; init; }
    public LeagueType League { get; init; }
    public bool IsActive { get; init; }
    public string? AdminNotes { get; init; }
}

public record DeleteAdminClubCommand
{
    public Guid ClubId { get; init; }
}

public record UploadClubLogoCommand
{
    public Guid ClubId { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public byte[] FileData { get; init; } = Array.Empty<byte>();
}

public record DeleteClubLogoCommand
{
    public Guid ClubId { get; init; }
}

public record BulkClubOperationCommand
{
    public IEnumerable<Guid> ClubIds { get; init; } = Enumerable.Empty<Guid>();
    public BulkOperationType Operation { get; init; }
    public Dictionary<string, object>? Parameters { get; init; }
}

public record GetClubAuditLogQuery
{
    public Guid ClubId { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

public record RestoreClubCommand
{
    public Guid ClubId { get; init; }
}