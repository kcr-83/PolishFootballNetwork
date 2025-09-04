namespace PolishFootballNetwork.Domain.Enums;

/// <summary>
/// Represents the type of file in the system.
/// </summary>
public enum FileType
{
    /// <summary>
    /// Generic document file (PDF, DOC, etc.).
    /// </summary>
    Document = 1,

    /// <summary>
    /// Image file (PNG, JPG, SVG, WebP, etc.).
    /// </summary>
    Image = 2,

    /// <summary>
    /// Video file (MP4, AVI, MOV, etc.).
    /// </summary>
    Video = 3,

    /// <summary>
    /// Audio file (MP3, WAV, OGG, etc.).
    /// </summary>
    Audio = 4,

    /// <summary>
    /// Archive file (ZIP, RAR, 7Z, etc.).
    /// </summary>
    Archive = 5,

    /// <summary>
    /// Spreadsheet file (XLS, CSV, etc.).
    /// </summary>
    Spreadsheet = 6,

    /// <summary>
    /// Presentation file (PPT, PPTX, etc.).
    /// </summary>
    Presentation = 7,

    /// <summary>
    /// Text file (TXT, RTF, etc.).
    /// </summary>
    Text = 8,

    /// <summary>
    /// Other/unknown file type.
    /// </summary>
    Other = 99
}
