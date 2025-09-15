using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Application.Common.Models;

namespace PolishFootballNetwork.Application.Features.Clubs.Commands.UploadLogo;

/// <summary>
/// Command to upload a logo for a club.
/// </summary>
public class UploadLogoCommand : ICommand<Result<FileUploadResultDto>>
{
    /// <summary>
    /// Gets or sets the club ID.
    /// </summary>
    public int ClubId { get; set; }

    /// <summary>
    /// Gets or sets the file name.
    /// </summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the content type.
    /// </summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the file content.
    /// </summary>
    public byte[] Content { get; set; } = Array.Empty<byte>();

    /// <summary>
    /// Gets or sets a value indicating whether to replace existing logo.
    /// </summary>
    public bool ReplaceExisting { get; set; } = true;

    /// <summary>
    /// Gets or sets the alternative text for the logo.
    /// </summary>
    public string? AlternativeText { get; set; }
}
