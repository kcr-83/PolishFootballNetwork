namespace PolishFootballNetwork.Application.Features.Connections.DTOs.Admin;

/// <summary>
/// Connection validation result for admin operations
/// </summary>
public sealed class ConnectionValidationDto
{
    public bool IsValid { get; set; }
    public string[] ValidationErrors { get; set; } = Array.Empty<string>();
    public string[] Warnings { get; set; } = Array.Empty<string>();
    public bool HasCircularReference { get; set; }
    public bool IsDuplicate { get; set; }
    public bool ClubsExist { get; set; }
}