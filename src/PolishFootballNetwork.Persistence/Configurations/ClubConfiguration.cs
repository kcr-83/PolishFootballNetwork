using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PolishFootballNetwork.Domain.Entities;

namespace PolishFootballNetwork.Persistence.Configurations;

/// <summary>
/// Entity Framework configuration for the Club entity.
/// </summary>
public class ClubConfiguration : IEntityTypeConfiguration<Club>
{
    /// <summary>
    /// Configures the Club entity.
    /// </summary>
    /// <param name="builder">The entity type builder.</param>
    public void Configure(EntityTypeBuilder<Club> builder)
    {
        // Table configuration
        builder.ToTable("Clubs");

        // Primary key
        builder.HasKey(c => c.Id);

        // Property configurations
        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(c => c.ShortName)
            .HasMaxLength(20);

        builder.Property(c => c.Slug)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(c => c.League)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(c => c.Country)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(c => c.City)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(c => c.Region)
            .HasMaxLength(100);

        builder.Property(c => c.LogoPath)
            .HasMaxLength(500);

        builder.Property(c => c.Founded)
            .IsRequired();

        builder.Property(c => c.Stadium)
            .HasMaxLength(200);

        builder.Property(c => c.Website)
            .HasMaxLength(500);

        builder.Property(c => c.Colors)
            .HasMaxLength(100);

        builder.Property(c => c.Description)
            .HasMaxLength(2000);

        builder.Property(c => c.Nickname)
            .HasMaxLength(100);

        builder.Property(c => c.Motto)
            .HasMaxLength(500);

        builder.Property(c => c.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(c => c.IsVerified)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(c => c.IsFeatured)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(c => c.Metadata)
            .HasColumnType("jsonb"); // PostgreSQL JSONB for flexible metadata storage

        builder.Property(c => c.CreatedAt)
            .IsRequired();

        builder.Property(c => c.ModifiedAt)
            .IsRequired();

        // Navigation properties - Club has a Connections collection
        builder.HasMany(c => c.Connections)
            .WithOne()
            .HasForeignKey("ClubId")
            .OnDelete(DeleteBehavior.Cascade);

        // Concurrency token
        builder.Property(c => c.ModifiedAt)
            .IsConcurrencyToken();
    }
}