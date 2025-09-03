namespace PolishFootballNetwork.Domain.Enums;

/// <summary>
/// Represents the type of file in the system.
/// </summary>
public enum FileType
{
    /// <summary>
    /// Club logo in SVG format - preferred format for scalability.
    /// </summary>
    LOGO_SVG = 1,

    /// <summary>
    /// Club logo or image in PNG format.
    /// </summary>
    IMAGE_PNG = 2,

    /// <summary>
    /// Club logo or image in JPG/JPEG format.
    /// </summary>
    IMAGE_JPG = 3,

    /// <summary>
    /// Generic document file.
    /// </summary>
    DOCUMENT = 4,

    /// <summary>
    /// Club logo or image in WebP format - modern optimized format.
    /// </summary>
    IMAGE_WEBP = 5
}
