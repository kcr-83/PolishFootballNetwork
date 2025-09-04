using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Domain.Enums;
using File = PolishFootballNetwork.Domain.Entities.File;

namespace PolishFootballNetwork.Domain.Repositories;

/// <summary>
/// Repository interface for managing File entities.
/// Defines the contract for data access operations related to uploaded files.
/// </summary>
public interface IFileRepository
{
    /// <summary>
    /// Gets a file by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the file.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The file if found; otherwise, null.</returns>
    Task<File?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a file by its stored filename.
    /// </summary>
    /// <param name="storedFileName">The stored filename of the file.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The file if found; otherwise, null.</returns>
    Task<File?> GetByStoredFileNameAsync(string storedFileName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all files in the system.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of all files.</returns>
    Task<IEnumerable<File>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets files uploaded by a specific user.
    /// </summary>
    /// <param name="userId">The identifier of the user who uploaded the files.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files uploaded by the specified user.</returns>
    Task<IEnumerable<File>> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets files by their type.
    /// </summary>
    /// <param name="fileType">The type of files to retrieve.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files of the specified type.</returns>
    Task<IEnumerable<File>> GetByFileTypeAsync(FileType fileType, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets files by their MIME type.
    /// </summary>
    /// <param name="mimeType">The MIME type of files to retrieve.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files with the specified MIME type.</returns>
    Task<IEnumerable<File>> GetByMimeTypeAsync(string mimeType, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all public files.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of public files.</returns>
    Task<IEnumerable<File>> GetPublicFilesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all private files.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of private files.</returns>
    Task<IEnumerable<File>> GetPrivateFilesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets files larger than the specified size.
    /// </summary>
    /// <param name="sizeInBytes">The minimum file size in bytes.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files larger than the specified size.</returns>
    Task<IEnumerable<File>> GetFilesLargerThanAsync(long sizeInBytes, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets files smaller than the specified size.
    /// </summary>
    /// <param name="sizeInBytes">The maximum file size in bytes.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files smaller than the specified size.</returns>
    Task<IEnumerable<File>> GetFilesSmallerThanAsync(long sizeInBytes, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets files uploaded within a specific date range.
    /// </summary>
    /// <param name="startDate">The start date of the range.</param>
    /// <param name="endDate">The end date of the range.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files uploaded within the specified date range.</returns>
    Task<IEnumerable<File>> GetFilesUploadedBetweenAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);

    /// <summary>
    /// Searches for files by their original filename (case-insensitive partial match).
    /// </summary>
    /// <param name="filenameSearchTerm">The search term to match against original filenames.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files matching the search term.</returns>
    Task<IEnumerable<File>> SearchByFilenameAsync(string filenameSearchTerm, CancellationToken cancellationToken = default);

    /// <summary>
    /// Searches for files by their description (case-insensitive partial match).
    /// </summary>
    /// <param name="descriptionSearchTerm">The search term to match against file descriptions.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files matching the search term.</returns>
    Task<IEnumerable<File>> SearchByDescriptionAsync(string descriptionSearchTerm, CancellationToken cancellationToken = default);

    /// <summary>
    /// Searches for files by their tags (case-insensitive partial match).
    /// </summary>
    /// <param name="tag">The tag to search for.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files with the specified tag.</returns>
    Task<IEnumerable<File>> SearchByTagAsync(string tag, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets files with their uploader information loaded.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files with their uploader information.</returns>
    Task<IEnumerable<File>> GetFilesWithUploaderAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the most recently uploaded files.
    /// </summary>
    /// <param name="count">The number of recent files to retrieve.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of the most recently uploaded files.</returns>
    Task<IEnumerable<File>> GetRecentFilesAsync(int count, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets files by their checksum for duplicate detection.
    /// </summary>
    /// <param name="checksum">The checksum to search for.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files with the specified checksum.</returns>
    Task<IEnumerable<File>> GetByChecksumAsync(string checksum, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a file with the specified stored filename already exists.
    /// </summary>
    /// <param name="storedFileName">The stored filename to check for uniqueness.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if a file with the stored filename exists; otherwise, false.</returns>
    Task<bool> ExistsWithStoredFileNameAsync(string storedFileName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a new file to the repository.
    /// </summary>
    /// <param name="file">The file to add.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task AddAsync(File file, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing file in the repository.
    /// </summary>
    /// <param name="file">The file to update.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task UpdateAsync(File file, CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes a file from the repository.
    /// </summary>
    /// <param name="file">The file to remove.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task RemoveAsync(File file, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the total count of files in the repository.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The total number of files.</returns>
    Task<int> GetCountAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the total size of all files in the repository.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The total size of all files in bytes.</returns>
    Task<long> GetTotalSizeAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the count of files by type.
    /// </summary>
    /// <param name="fileType">The file type to count.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The number of files of the specified type.</returns>
    Task<int> GetCountByTypeAsync(FileType fileType, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a paginated list of files.
    /// </summary>
    /// <param name="pageNumber">The page number (1-based).</param>
    /// <param name="pageSize">The number of items per page.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A paginated collection of files.</returns>
    Task<IEnumerable<File>> GetPagedAsync(int pageNumber, int pageSize, CancellationToken cancellationToken = default);
}
