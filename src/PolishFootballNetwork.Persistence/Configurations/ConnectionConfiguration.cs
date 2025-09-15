using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PolishFootballNetwork.Domain.Entities;

namespace PolishFootballNetwork.Persistence.Configurations;

/// <summary>
/// Entity Framework configuration for the Connection entity.
/// </summary>
public class ConnectionConfiguration : IEntityTypeConfiguration<Connection>
{
    /// <summary>
    /// Configures the Connection entity.
    /// </summary>
    /// <param name="builder">The entity type builder.</param>
    public void Configure(EntityTypeBuilder<Connection> builder)
    {
        // Table configuration with check constraint
        builder.ToTable("Connections", t =>
            t.HasCheckConstraint(
                "CK_Connections_NoSelfConnection",
                "\"SourceClubId\" <> \"TargetClubId\""));

        // Primary key
        builder.HasKey(c => c.Id);

        // Property configurations
        builder.Property(c => c.SourceClubId)
            .IsRequired();

        builder.Property(c => c.TargetClubId)
            .IsRequired();

        builder.Property(c => c.Type)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(c => c.Strength)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(c => c.Description)
            .HasMaxLength(2000);

        builder.Property(c => c.Notes)
            .HasMaxLength(2000);

        builder.Property(c => c.CreatedAt)
            .IsRequired();

        builder.Property(c => c.ModifiedAt)
            .IsRequired();

        // Relationships with clubs
        builder.HasOne(c => c.SourceClub)
            .WithMany()
            .HasForeignKey(c => c.SourceClubId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Connections_SourceClub");

        builder.HasOne(c => c.TargetClub)
            .WithMany()
            .HasForeignKey(c => c.TargetClubId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Connections_TargetClub");

        // Concurrency token
        builder.Property(c => c.ModifiedAt)
            .IsConcurrencyToken();
    }
}