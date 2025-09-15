namespace PolishFootballNetwork.Application.Features.Connections.DTOs.Admin;

/// <summary>
/// Response DTO for bulk operations on connections
/// </summary>
public sealed class BulkConnectionOperationResultDto
{
    public int TotalRequested { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public string[] FailedIds { get; set; } = Array.Empty<string>();
    public string[] ErrorMessages { get; set; } = Array.Empty<string>();
    public DateTime ProcessedAt { get; set; }
    public TimeSpan ProcessingTime { get; set; }
}