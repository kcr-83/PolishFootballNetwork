using System.ComponentModel.DataAnnotations;

namespace PolishFootballNetwork.Application.Common.Models;

/// <summary>
/// File upload request for admin operations.
/// </summary>
public sealed class FileUploadDto
{
    [Required(ErrorMessage = "File name is required")]
    public string FileName { get; set; } = string.Empty;

    [Required(ErrorMessage = "File content is required")]
    public byte[] FileContent { get; set; } = Array.Empty<byte>();

    [Required(ErrorMessage = "Content type is required")]
    public string ContentType { get; set; } = string.Empty;

    [StringLength(100, ErrorMessage = "Alt text cannot exceed 100 characters")]
    public string? AltText { get; set; }

    [StringLength(200, ErrorMessage = "Description cannot exceed 200 characters")]
    public string? Description { get; set; }

    public bool IsPublic { get; set; } = true;
    public string? Category { get; set; }
}