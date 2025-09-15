using System.ComponentModel.DataAnnotations;

namespace PolishFootballNetwork.Application.Features.Connections.DTOs.Admin;

/// <summary>
/// DTO for bulk connection operations
/// </summary>
public sealed class BulkConnectionOperationDto
{
    [Required(ErrorMessage = "Connection IDs are required")]
    [MinLength(1, ErrorMessage = "At least one connection ID is required")]
    public int[] ConnectionIds { get; set; } = Array.Empty<int>();

    [Required(ErrorMessage = "Operation type is required")]
    public BulkConnectionOperationType Operation { get; set; }

    public Dictionary<string, object>? Parameters { get; set; }
}

/// <summary>
/// Available bulk operations for connections
/// </summary>
public enum BulkConnectionOperationType
{
    Activate,
    Deactivate,
    Verify,
    Unverify,
    UpdateStrength,
    UpdateType,
    UpdateStatus,
    Delete,
    MakeBidirectional,
    MakeUnidirectional,
    UpdateSeason
}