using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;

namespace PolishFootballNetwork.Application.Features.Dashboard.Queries.GetDashboardStats;

/// <summary>
/// Query to get dashboard statistics.
/// </summary>
public class GetDashboardStatsQuery : IQuery<Result<DashboardStatsDto>>
{
    /// <summary>
    /// Gets or sets the date range start for filtering statistics.
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// Gets or sets the date range end for filtering statistics.
    /// </summary>
    public DateTime? EndDate { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether to include detailed breakdowns.
    /// </summary>
    public bool IncludeDetails { get; set; } = false;
}

/// <summary>
/// DTO for dashboard statistics.
/// </summary>
public class DashboardStatsDto
{
    /// <summary>
    /// Gets or sets the total number of clubs.
    /// </summary>
    public int TotalClubs { get; set; }

    /// <summary>
    /// Gets or sets the number of active clubs.
    /// </summary>
    public int ActiveClubs { get; set; }

    /// <summary>
    /// Gets or sets the number of verified clubs.
    /// </summary>
    public int VerifiedClubs { get; set; }

    /// <summary>
    /// Gets or sets the number of featured clubs.
    /// </summary>
    public int FeaturedClubs { get; set; }

    /// <summary>
    /// Gets or sets the total number of connections.
    /// </summary>
    public int TotalConnections { get; set; }

    /// <summary>
    /// Gets or sets the number of verified connections.
    /// </summary>
    public int VerifiedConnections { get; set; }

    /// <summary>
    /// Gets or sets the number of connections requiring verification.
    /// </summary>
    public int ConnectionsRequiringVerification { get; set; }

    /// <summary>
    /// Gets or sets the total number of users.
    /// </summary>
    public int TotalUsers { get; set; }

    /// <summary>
    /// Gets or sets the number of active users.
    /// </summary>
    public int ActiveUsers { get; set; }

    /// <summary>
    /// Gets or sets the total number of uploaded files.
    /// </summary>
    public int TotalFiles { get; set; }

    /// <summary>
    /// Gets or sets the total file storage size in bytes.
    /// </summary>
    public long TotalFileSize { get; set; }

    /// <summary>
    /// Gets or sets the clubs by league breakdown.
    /// </summary>
    public Dictionary<string, int> ClubsByLeague { get; set; } = new();

    /// <summary>
    /// Gets or sets the connections by type breakdown.
    /// </summary>
    public Dictionary<string, int> ConnectionsByType { get; set; } = new();

    /// <summary>
    /// Gets or sets the connections by strength breakdown.
    /// </summary>
    public Dictionary<string, int> ConnectionsByStrength { get; set; } = new();

    /// <summary>
    /// Gets or sets the recent activity summary.
    /// </summary>
    public RecentActivityDto RecentActivity { get; set; } = new();

    /// <summary>
    /// Gets or sets the system health indicators.
    /// </summary>
    public SystemHealthDto SystemHealth { get; set; } = new();

    /// <summary>
    /// Gets or sets the data generation timestamp.
    /// </summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// DTO for recent activity summary.
/// </summary>
public class RecentActivityDto
{
    /// <summary>
    /// Gets or sets the number of clubs created in the last 30 days.
    /// </summary>
    public int ClubsCreatedLast30Days { get; set; }

    /// <summary>
    /// Gets or sets the number of connections created in the last 30 days.
    /// </summary>
    public int ConnectionsCreatedLast30Days { get; set; }

    /// <summary>
    /// Gets or sets the number of users registered in the last 30 days.
    /// </summary>
    public int UsersRegisteredLast30Days { get; set; }

    /// <summary>
    /// Gets or sets the number of files uploaded in the last 30 days.
    /// </summary>
    public int FilesUploadedLast30Days { get; set; }

    /// <summary>
    /// Gets or sets the last login timestamp.
    /// </summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// Gets or sets the last data modification timestamp.
    /// </summary>
    public DateTime? LastDataModificationAt { get; set; }
}

/// <summary>
/// DTO for system health indicators.
/// </summary>
public class SystemHealthDto
{
    /// <summary>
    /// Gets or sets the database health status.
    /// </summary>
    public string DatabaseHealth { get; set; } = "Unknown";

    /// <summary>
    /// Gets or sets the file system health status.
    /// </summary>
    public string FileSystemHealth { get; set; } = "Unknown";

    /// <summary>
    /// Gets or sets the cache health status.
    /// </summary>
    public string CacheHealth { get; set; } = "Unknown";

    /// <summary>
    /// Gets or sets the overall system status.
    /// </summary>
    public string OverallStatus { get; set; } = "Unknown";

    /// <summary>
    /// Gets or sets the current server time.
    /// </summary>
    public DateTime ServerTime { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the application uptime.
    /// </summary>
    public TimeSpan? Uptime { get; set; }

    /// <summary>
    /// Gets or sets any health warnings.
    /// </summary>
    public IReadOnlyList<string> Warnings { get; set; } = Array.Empty<string>();
}
