using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PolishFootballNetwork.Domain.Entities;

namespace PolishFootballNetwork.Persistence.Configurations;

/// <summary>
/// Entity Framework configuration for the File entity.
/// </summary>
public class FileConfiguration : IEntityTypeConfiguration<File>
{
    /// <summary>
    /// Configures the File entity.
    /// </summary>
    /// <param name="builder">The entity type builder.</param>
    public void Configure(EntityTypeBuilder<File> builder)
    {
        // Table configuration
        builder.ToTable("Files");

        // Primary key
        builder.HasKey(f => f.Id);

        // Property configurations
        builder.Property(f => f.OriginalFileName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(f => f.StoredFileName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(f => f.FilePath)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(f => f.MimeType)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(f => f.SizeInBytes)
            .IsRequired();

        builder.Property(f => f.FileType)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(f => f.UploadedByUserId)
            .IsRequired();

        builder.Property(f => f.EntityId);

        builder.Property(f => f.CreatedAt)
            .IsRequired();

        builder.Property(f => f.ModifiedAt)
            .IsRequired();

        // Relationships
        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(f => f.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Files_UploadedByUser");

        // Concurrency token
        builder.Property(f => f.ModifiedAt)
            .IsConcurrencyToken();
    }
}