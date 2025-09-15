using Microsoft.EntityFrameworkCore;
using PolishFootballNetwork.Domain.Common;
using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Persistence.Configurations;
using File = PolishFootballNetwork.Domain.Entities.File;

namespace PolishFootballNetwork.Persistence;

/// <summary>
/// Database context for the Polish Football Network application.
/// Manages all entities and their relationships using Entity Framework Core.
/// </summary>
public class FootballNetworkDbContext : DbContext
{
    /// <summary>
    /// Initializes a new instance of the <see cref="FootballNetworkDbContext"/> class.
    /// </summary>
    /// <param name="options">The database context options.</param>
    public FootballNetworkDbContext(DbContextOptions<FootballNetworkDbContext> options) : base(options)
    {
    }

    /// <summary>
    /// Gets or sets the clubs DbSet.
    /// </summary>
    public DbSet<Club> Clubs { get; set; } = default!;

    /// <summary>
    /// Gets or sets the connections DbSet.
    /// </summary>
    public DbSet<Connection> Connections { get; set; } = default!;

    /// <summary>
    /// Gets or sets the users DbSet.
    /// </summary>
    public DbSet<User> Users { get; set; } = default!;

    /// <summary>
    /// Gets or sets the files DbSet.
    /// </summary>
    public DbSet<File> Files { get; set; } = default!;

    /// <summary>
    /// Configures the model and relationships for all entities.
    /// </summary>
    /// <param name="modelBuilder">The model builder instance.</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all entity configurations
        modelBuilder.ApplyConfiguration(new ClubConfiguration());
        modelBuilder.ApplyConfiguration(new ConnectionConfiguration());
        modelBuilder.ApplyConfiguration(new UserConfiguration());
        modelBuilder.ApplyConfiguration(new FileConfiguration());

        // Configure value object conversions
        ConfigureValueObjects(modelBuilder);

        // Add indexes for performance
        ConfigureIndexes(modelBuilder);

        // Seed initial data
        SeedData(modelBuilder);
    }

    /// <summary>
    /// Saves changes to the database with automatic audit field updates.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The number of entities written to the database.</returns>
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateAuditFields();
        return await base.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Saves changes to the database with automatic audit field updates.
    /// </summary>
    /// <returns>The number of entities written to the database.</returns>
    public override int SaveChanges()
    {
        UpdateAuditFields();
        return base.SaveChanges();
    }

    /// <summary>
    /// Configures value object conversions for Entity Framework.
    /// </summary>
    /// <param name="modelBuilder">The model builder instance.</param>
    private static void ConfigureValueObjects(ModelBuilder modelBuilder)
    {
        // Configure Point2D value object for Club.Position
        modelBuilder.Entity<Club>()
            .OwnsOne(c => c.Position, position =>
            {
                position.Property(p => p.X).HasColumnName("PositionX").HasPrecision(18, 6);
                position.Property(p => p.Y).HasColumnName("PositionY").HasPrecision(18, 6);
            });

        // Configure DateRange value object for Connection
        modelBuilder.Entity<Connection>()
            .OwnsOne(c => c.ActivePeriod, period =>
            {
                period.Property(p => p.Start).HasColumnName("StartYear");
                period.Property(p => p.End).HasColumnName("EndYear");
            });
    }

    /// <summary>
    /// Configures database indexes for performance optimization.
    /// </summary>
    /// <param name="modelBuilder">The model builder instance.</param>
    private static void ConfigureIndexes(ModelBuilder modelBuilder)
    {
        // Club indexes
        modelBuilder.Entity<Club>()
            .HasIndex(c => c.Name)
            .HasDatabaseName("IX_Clubs_Name");

        modelBuilder.Entity<Club>()
            .HasIndex(c => c.Slug)
            .IsUnique()
            .HasDatabaseName("IX_Clubs_Slug_Unique");

        modelBuilder.Entity<Club>()
            .HasIndex(c => c.League)
            .HasDatabaseName("IX_Clubs_League");

        modelBuilder.Entity<Club>()
            .HasIndex(c => c.City)
            .HasDatabaseName("IX_Clubs_City");

        modelBuilder.Entity<Club>()
            .HasIndex(c => new { c.IsActive, c.IsVerified })
            .HasDatabaseName("IX_Clubs_Active_Verified");

        // Connection indexes
        modelBuilder.Entity<Connection>()
            .HasIndex(c => c.SourceClubId)
            .HasDatabaseName("IX_Connections_SourceClubId");

        modelBuilder.Entity<Connection>()
            .HasIndex(c => c.TargetClubId)
            .HasDatabaseName("IX_Connections_TargetClubId");

        modelBuilder.Entity<Connection>()
            .HasIndex(c => c.Type)
            .HasDatabaseName("IX_Connections_Type");

        modelBuilder.Entity<Connection>()
            .HasIndex(c => new { c.SourceClubId, c.TargetClubId })
            .IsUnique()
            .HasDatabaseName("IX_Connections_SourceTarget_Unique");

        // User indexes
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique()
            .HasDatabaseName("IX_Users_Username_Unique");

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique()
            .HasDatabaseName("IX_Users_Email_Unique");

        // File indexes
        modelBuilder.Entity<File>()
            .HasIndex(f => f.EntityId)
            .HasDatabaseName("IX_Files_EntityId");

        modelBuilder.Entity<File>()
            .HasIndex(f => f.FileType)
            .HasDatabaseName("IX_Files_Type");
    }

    /// <summary>
    /// Seeds initial data into the database.
    /// Note: Since domain entities have private setters, seed data will be added via migrations or data seeding services.
    /// </summary>
    /// <param name="modelBuilder">The model builder instance.</param>
    private static void SeedData(ModelBuilder modelBuilder)
    {
        // TODO: Implement data seeding using SQL scripts or migration data seeding
        // This will be handled in a separate data seeding service or migration
    }

    /// <summary>
    /// Updates audit fields for entities that implement the Entity base class using reflection.
    /// </summary>
    private void UpdateAuditFields()
    {
        var entries = ChangeTracker.Entries<Entity>()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            var entity = entry.Entity;
            var entityType = typeof(Entity);

            if (entry.State == EntityState.Added)
            {
                // Set CreatedAt for new entities
                var createdAtProperty = entityType.GetProperty(nameof(Entity.CreatedAt));
                createdAtProperty?.SetValue(entity, DateTime.UtcNow);
            }

            // Always update ModifiedAt for added or modified entities
            var modifiedAtProperty = entityType.GetProperty(nameof(Entity.ModifiedAt));
            modifiedAtProperty?.SetValue(entity, DateTime.UtcNow);
        }
    }
}