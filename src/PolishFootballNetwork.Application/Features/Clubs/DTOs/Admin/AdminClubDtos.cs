using System.ComponentModel.DataAnnotations;
using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.Application.Features.Clubs.DTOs.Admin;

/// <summary>
/// Complete club DTO for admin operations including inactive clubs and full metadata
/// </summary>
public sealed class AdminClubDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ShortName { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public LeagueType League { get; set; }
    public string Country { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Region { get; set; }
    public string? LogoPath { get; set; }
    public decimal PositionX { get; set; }
    public decimal PositionY { get; set; }
    public int? Founded { get; set; }
    public string? Stadium { get; set; }
    public string? Website { get; set; }
    public string? Colors { get; set; }
    public string? Description { get; set; }
    public string? Nickname { get; set; }
    public string? Motto { get; set; }
    public bool IsActive { get; set; }
    public bool IsVerified { get; set; }
    public bool IsFeatured { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
    public int ConnectionCount { get; set; }
    public DateTime? LastActivityAt { get; set; }
}

/// <summary>
/// DTO for creating a new club via admin interface
/// </summary>
public sealed class CreateClubDto
{
    [Required(ErrorMessage = "Club name is required")]
    [StringLength(100, ErrorMessage = "Club name cannot exceed 100 characters")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Short name is required")]
    [StringLength(20, ErrorMessage = "Short name cannot exceed 20 characters")]
    public string ShortName { get; set; } = string.Empty;

    [Required(ErrorMessage = "League is required")]
    public LeagueType League { get; set; }

    [Required(ErrorMessage = "Country is required")]
    [StringLength(50, ErrorMessage = "Country cannot exceed 50 characters")]
    public string Country { get; set; } = string.Empty;

    [Required(ErrorMessage = "City is required")]
    [StringLength(50, ErrorMessage = "City cannot exceed 50 characters")]
    public string City { get; set; } = string.Empty;

    [StringLength(50, ErrorMessage = "Region cannot exceed 50 characters")]
    public string? Region { get; set; }

    [Range(-180, 180, ErrorMessage = "Position X must be between -180 and 180")]
    public decimal PositionX { get; set; }

    [Range(-90, 90, ErrorMessage = "Position Y must be between -90 and 90")]
    public decimal PositionY { get; set; }

    [Range(1850, 2030, ErrorMessage = "Founded year must be between 1850 and 2030")]
    public int? Founded { get; set; }

    [StringLength(100, ErrorMessage = "Stadium name cannot exceed 100 characters")]
    public string? Stadium { get; set; }

    [Url(ErrorMessage = "Website must be a valid URL")]
    [StringLength(200, ErrorMessage = "Website URL cannot exceed 200 characters")]
    public string? Website { get; set; }

    [StringLength(50, ErrorMessage = "Colors cannot exceed 50 characters")]
    public string? Colors { get; set; }

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
    public string? Description { get; set; }

    [StringLength(50, ErrorMessage = "Nickname cannot exceed 50 characters")]
    public string? Nickname { get; set; }

    [StringLength(200, ErrorMessage = "Motto cannot exceed 200 characters")]
    public string? Motto { get; set; }

    public bool IsActive { get; set; } = true;
    public bool IsVerified { get; set; } = false;
    public bool IsFeatured { get; set; } = false;
}

/// <summary>
/// DTO for updating an existing club via admin interface
/// </summary>
public sealed class UpdateClubDto
{
    [Required(ErrorMessage = "Club ID is required")]
    public int Id { get; set; }

    [Required(ErrorMessage = "Club name is required")]
    [StringLength(100, ErrorMessage = "Club name cannot exceed 100 characters")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Short name is required")]
    [StringLength(20, ErrorMessage = "Short name cannot exceed 20 characters")]
    public string ShortName { get; set; } = string.Empty;

    [Required(ErrorMessage = "League is required")]
    public LeagueType League { get; set; }

    [Required(ErrorMessage = "Country is required")]
    [StringLength(50, ErrorMessage = "Country cannot exceed 50 characters")]
    public string Country { get; set; } = string.Empty;

    [Required(ErrorMessage = "City is required")]
    [StringLength(50, ErrorMessage = "City cannot exceed 50 characters")]
    public string City { get; set; } = string.Empty;

    [StringLength(50, ErrorMessage = "Region cannot exceed 50 characters")]
    public string? Region { get; set; }

    [Range(-180, 180, ErrorMessage = "Position X must be between -180 and 180")]
    public decimal PositionX { get; set; }

    [Range(-90, 90, ErrorMessage = "Position Y must be between -90 and 90")]
    public decimal PositionY { get; set; }

    [Range(1850, 2030, ErrorMessage = "Founded year must be between 1850 and 2030")]
    public int? Founded { get; set; }

    [StringLength(100, ErrorMessage = "Stadium name cannot exceed 100 characters")]
    public string? Stadium { get; set; }

    [Url(ErrorMessage = "Website must be a valid URL")]
    [StringLength(200, ErrorMessage = "Website URL cannot exceed 200 characters")]
    public string? Website { get; set; }

    [StringLength(50, ErrorMessage = "Colors cannot exceed 50 characters")]
    public string? Colors { get; set; }

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
    public string? Description { get; set; }

    [StringLength(50, ErrorMessage = "Nickname cannot exceed 50 characters")]
    public string? Nickname { get; set; }

    [StringLength(200, ErrorMessage = "Motto cannot exceed 200 characters")]
    public string? Motto { get; set; }

    public bool IsActive { get; set; }
    public bool IsVerified { get; set; }
    public bool IsFeatured { get; set; }
}

/// <summary>
/// Response DTO for logo upload operations
/// </summary>
public sealed class LogoUploadResponseDto
{
    public string LogoPath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
    public bool IsOptimized { get; set; }
}

/// <summary>
/// DTO for bulk club operations
/// </summary>
public sealed class BulkClubOperationDto
{
    [Required(ErrorMessage = "Club IDs are required")]
    [MinLength(1, ErrorMessage = "At least one club ID is required")]
    public int[] ClubIds { get; set; } = Array.Empty<int>();

    [Required(ErrorMessage = "Operation type is required")]
    public BulkOperationType Operation { get; set; }

    public Dictionary<string, object>? Parameters { get; set; }
}

/// <summary>
/// Available bulk operations for clubs
/// </summary>
public enum BulkOperationType
{
    Activate,
    Deactivate,
    Verify,
    Unverify,
    Feature,
    Unfeature,
    UpdateLeague,
    Delete
}