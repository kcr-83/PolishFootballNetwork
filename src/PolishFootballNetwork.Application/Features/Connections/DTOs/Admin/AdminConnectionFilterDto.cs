using PolishFootballNetwork.Domain.Enums;

namespace PolishFootballNetwork.Application.Features.Connections.DTOs.Admin;

/// <summary>
/// Filter options for admin connection queries
/// </summary>
public sealed class AdminConnectionFilterDto
{
    public int? SourceClubId { get; set; }
    public int? TargetClubId { get; set; }
    public ConnectionType? Type { get; set; }
    public int? MinStrength { get; set; }
    public int? MaxStrength { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsVerified { get; set; }
    public bool? IsBidirectional { get; set; }
    public ConnectionStatus? Status { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public DateTime? UpdatedAfter { get; set; }
    public DateTime? UpdatedBefore { get; set; }
    public int? Season { get; set; }
    public bool? IsHistorical { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}