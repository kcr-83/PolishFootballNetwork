using System.ComponentModel.DataAnnotations;
using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.Application.Features.Connections.DTOs.Admin;

/// <summary>
/// DTO for updating an existing connection via admin interface
/// </summary>
public sealed class UpdateConnectionDto
{
    [Required(ErrorMessage = "Connection ID is required")]
    public int Id { get; set; }

    [Required(ErrorMessage = "Source club ID is required")]
    public int SourceClubId { get; set; }

    [Required(ErrorMessage = "Target club ID is required")]
    public int TargetClubId { get; set; }

    [Required(ErrorMessage = "Connection type is required")]
    public ConnectionType Type { get; set; }

    [Required(ErrorMessage = "Strength is required")]
    [Range(1, 10, ErrorMessage = "Strength must be between 1 and 10")]
    public int Strength { get; set; }

    [Required(ErrorMessage = "Description is required")]
    [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
    public string Description { get; set; } = string.Empty;

    public bool IsActive { get; set; }
    public bool IsVerified { get; set; }
    public bool IsBidirectional { get; set; }

    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    [Range(0, 100, ErrorMessage = "Player count must be between 0 and 100")]
    public int? PlayerCount { get; set; }

    [Range(0, 1000000000, ErrorMessage = "Transfer value must be positive")]
    public decimal? TransferValue { get; set; }

    [StringLength(1000, ErrorMessage = "Notes cannot exceed 1000 characters")]
    public string? Notes { get; set; }

    public ConnectionStatus Status { get; set; }

    [Range(1900, 2030, ErrorMessage = "Season must be between 1900 and 2030")]
    public int? Season { get; set; }

    public bool IsHistorical { get; set; }
}