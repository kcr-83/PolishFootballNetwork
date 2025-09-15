namespace PolishFootballNetwork.Application.Features.Dashboard.DTOs.Admin;

/// <summary>
/// Complete dashboard statistics for admin interface
/// </summary>
public sealed class AdminDashboardStatsDto
{
    public int TotalClubs { get; set; }
    public int ActiveClubs { get; set; }
    public int InactiveClubs { get; set; }
    public int VerifiedClubs { get; set; }
    public int TotalConnections { get; set; }
    public int ActiveConnections { get; set; }
    public int PendingConnections { get; set; }
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int NewUsersToday { get; set; }
    public int NewClubsToday { get; set; }
    public int NewConnectionsToday { get; set; }
    public int TotalApiCalls { get; set; }
    public int ApiCallsToday { get; set; }
    public decimal SystemHealth { get; set; }
    public string ServerStatus { get; set; } = string.Empty;
    public long DatabaseSize { get; set; }
    public long TotalUploads { get; set; }
    public long OrphanedFiles { get; set; }
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// System health information for admin monitoring
/// </summary>
public sealed class SystemHealthDto
{
    public bool DatabaseStatus { get; set; }
    public bool CacheStatus { get; set; }
    public bool StorageStatus { get; set; }
    public bool ApiStatus { get; set; }
    public decimal CpuUsage { get; set; }
    public decimal MemoryUsage { get; set; }
    public long DatabaseConnections { get; set; }
    public long CacheHitRate { get; set; }
    public TimeSpan Uptime { get; set; }
    public string Version { get; set; } = string.Empty;
    public DateTime LastHealthCheck { get; set; }
    public string[] Warnings { get; set; } = Array.Empty<string>();
    public string[] Errors { get; set; } = Array.Empty<string>();
}