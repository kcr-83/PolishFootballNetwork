using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.Application.Features.Connections.DTOs.Admin;

/// <summary>
/// Complete connection DTO for admin operations including full metadata
/// </summary>
public sealed class AdminConnectionDto
{
    public int Id { get; set; }
    public int SourceClubId { get; set; }
    public string SourceClubName { get; set; } = string.Empty;
    public string SourceClubShortName { get; set; } = string.Empty;
    public int TargetClubId { get; set; }
    public string TargetClubName { get; set; } = string.Empty;
    public string TargetClubShortName { get; set; } = string.Empty;
    public ConnectionType Type { get; set; }
    public int Strength { get; set; }
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsVerified { get; set; }
    public bool IsBidirectional { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? PlayerCount { get; set; }
    public decimal? TransferValue { get; set; }
    public string? Notes { get; set; }
    public ConnectionStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
    public int? Season { get; set; }
    public bool IsHistorical { get; set; }
}