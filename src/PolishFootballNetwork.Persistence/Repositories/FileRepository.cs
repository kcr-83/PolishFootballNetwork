using Microsoft.EntityFrameworkCore;
using PolishFootballNetwork.Domain.Entities;
using PolishFootballNetwork.Domain.Enums;
using PolishFootballNetwork.Domain.Repositories;
using File = PolishFootballNetwork.Domain.Entities.File;

namespace PolishFootballNetwork.Persistence.Repositories;

/// <summary>
/// Repository implementation for managing File entities using Entity Framework Core.
/// Provides data access operations for uploaded files with efficient querying and filtering.
/// </summary>
public class FileRepository : IFileRepository
{
    private readonly FootballNetworkDbContext _context;

    /// <summary>
    /// Initializes a new instance of the FileRepository class.
    /// </summary>
    /// <param name="context">The database context.</param>
    public FileRepository(FootballNetworkDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <summary>
    /// Gets a file by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the file.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The file if found; otherwise, null.</returns>
    public async Task<File?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .FirstOrDefaultAsync(f => f.Id == id, cancellationToken);
    }

    /// <summary>
    /// Gets a file by its stored filename.
    /// </summary>
    /// <param name="storedFileName">The stored filename of the file.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The file if found; otherwise, null.</returns>
    public async Task<File?> GetByStoredFileNameAsync(string storedFileName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(storedFileName))
        {
            return null;
        }

        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .FirstOrDefaultAsync(f => f.StoredFileName == storedFileName, cancellationToken);
    }

    /// <summary>
    /// Gets all files in the system.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of all files.</returns>
    public async Task<IEnumerable<File>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets files uploaded by a specific user.
    /// </summary>
    /// <param name="userId">The identifier of the user who uploaded the files.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files uploaded by the specified user.</returns>
    public async Task<IEnumerable<File>> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default)
    {
        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .Where(f => f.UploadedById == userId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets files by their type.
    /// </summary>
    /// <param name="fileType">The type of files to retrieve.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files of the specified type.</returns>
    public async Task<IEnumerable<File>> GetByFileTypeAsync(FileType fileType, CancellationToken cancellationToken = default)
    {
        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .Where(f => f.FileType == fileType)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets files by their MIME type.
    /// </summary>
    /// <param name="mimeType">The MIME type of files to retrieve.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files with the specified MIME type.</returns>
    public async Task<IEnumerable<File>> GetByMimeTypeAsync(string mimeType, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(mimeType))
        {
            return Enumerable.Empty<File>();
        }

        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .Where(f => f.MimeType == mimeType)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets all public files.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of public files.</returns>
    public async Task<IEnumerable<File>> GetPublicFilesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .Where(f => f.IsPublic)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets all private files.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of private files.</returns>
    public async Task<IEnumerable<File>> GetPrivateFilesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .Where(f => !f.IsPublic)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets files larger than the specified size.
    /// </summary>
    /// <param name="sizeInBytes">The minimum file size in bytes.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files larger than the specified size.</returns>
    public async Task<IEnumerable<File>> GetFilesLargerThanAsync(long sizeInBytes, CancellationToken cancellationToken = default)
    {
        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .Where(f => f.SizeInBytes > sizeInBytes)
            .OrderByDescending(f => f.SizeInBytes)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets files smaller than the specified size.
    /// </summary>
    /// <param name="sizeInBytes">The maximum file size in bytes.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files smaller than the specified size.</returns>
    public async Task<IEnumerable<File>> GetFilesSmallerThanAsync(long sizeInBytes, CancellationToken cancellationToken = default)
    {
        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .Where(f => f.SizeInBytes < sizeInBytes)
            .OrderBy(f => f.SizeInBytes)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets files uploaded within a specific date range.
    /// </summary>
    /// <param name="startDate">The start date of the range.</param>
    /// <param name="endDate">The end date of the range.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files uploaded within the specified date range.</returns>
    public async Task<IEnumerable<File>> GetFilesUploadedBetweenAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .Where(f => f.CreatedAt >= startDate && f.CreatedAt <= endDate)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Searches for files by their original filename (case-insensitive partial match).
    /// </summary>
    /// <param name="filenameSearchTerm">The search term to match against original filenames.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files matching the search term.</returns>
    public async Task<IEnumerable<File>> SearchByFilenameAsync(string filenameSearchTerm, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(filenameSearchTerm))
        {
            return Enumerable.Empty<File>();
        }

        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .Where(f => EF.Functions.ILike(f.OriginalFileName, $"%{filenameSearchTerm}%"))
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Searches for files by their description (case-insensitive partial match).
    /// </summary>
    /// <param name="descriptionSearchTerm">The search term to match against file descriptions.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files matching the search term.</returns>
    public async Task<IEnumerable<File>> SearchByDescriptionAsync(string descriptionSearchTerm, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(descriptionSearchTerm))
        {
            return Enumerable.Empty<File>();
        }

        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .Where(f => !string.IsNullOrEmpty(f.Description) && 
                       EF.Functions.ILike(f.Description, $"%{descriptionSearchTerm}%"))
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Searches for files by their tags (case-insensitive partial match).
    /// </summary>
    /// <param name="tag">The tag to search for.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files with the specified tag.</returns>
    public async Task<IEnumerable<File>> SearchByTagAsync(string tag, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tag))
        {
            return Enumerable.Empty<File>();
        }

        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .Where(f => f.Tags != null && f.Tags.Any(t => EF.Functions.ILike(t, tag)))
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets files with their uploader information loaded.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files with their uploader information.</returns>
    public async Task<IEnumerable<File>> GetFilesWithUploaderAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets the most recently uploaded files.
    /// </summary>
    /// <param name="count">The number of recent files to retrieve.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of the most recently uploaded files.</returns>
    public async Task<IEnumerable<File>> GetRecentFilesAsync(int count, CancellationToken cancellationToken = default)
    {
        if (count <= 0)
        {
            count = 10;
        }

        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .OrderByDescending(f => f.CreatedAt)
            .Take(count)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Gets files by their checksum for duplicate detection.
    /// </summary>
    /// <param name="checksum">The checksum to search for.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of files with the specified checksum.</returns>
    public async Task<IEnumerable<File>> GetByChecksumAsync(string checksum, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(checksum))
        {
            return Enumerable.Empty<File>();
        }

        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .Where(f => f.Checksum == checksum)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Checks if a file with the specified stored filename already exists.
    /// </summary>
    /// <param name="storedFileName">The stored filename to check for uniqueness.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if a file with the stored filename exists; otherwise, false.</returns>
    public async Task<bool> ExistsWithStoredFileNameAsync(string storedFileName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(storedFileName))
        {
            return false;
        }

        return await _context.Files
            .AsNoTracking()
            .AnyAsync(f => f.StoredFileName == storedFileName, cancellationToken);
    }

    /// <summary>
    /// Adds a new file to the repository.
    /// </summary>
    /// <param name="file">The file to add.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task AddAsync(File file, CancellationToken cancellationToken = default)
    {
        if (file == null)
        {
            throw new ArgumentNullException(nameof(file));
        }

        await _context.Files.AddAsync(file, cancellationToken);
    }

    /// <summary>
    /// Updates an existing file in the repository.
    /// </summary>
    /// <param name="file">The file to update.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task UpdateAsync(File file, CancellationToken cancellationToken = default)
    {
        if (file == null)
        {
            throw new ArgumentNullException(nameof(file));
        }

        _context.Files.Update(file);
        await Task.CompletedTask;
    }

    /// <summary>
    /// Removes a file from the repository.
    /// </summary>
    /// <param name="file">The file to remove.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task RemoveAsync(File file, CancellationToken cancellationToken = default)
    {
        if (file == null)
        {
            throw new ArgumentNullException(nameof(file));
        }

        _context.Files.Remove(file);
        await Task.CompletedTask;
    }

    /// <summary>
    /// Gets the total count of files in the repository.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The total number of files.</returns>
    public async Task<int> GetCountAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Files.CountAsync(cancellationToken);
    }

    /// <summary>
    /// Gets the total size of all files in the repository.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The total size of all files in bytes.</returns>
    public async Task<long> GetTotalSizeAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Files.SumAsync(f => f.SizeInBytes, cancellationToken);
    }

    /// <summary>
    /// Gets the count of files by type.
    /// </summary>
    /// <param name="fileType">The file type to count.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The number of files of the specified type.</returns>
    public async Task<int> GetCountByTypeAsync(FileType fileType, CancellationToken cancellationToken = default)
    {
        return await _context.Files
            .Where(f => f.FileType == fileType)
            .CountAsync(cancellationToken);
    }

    /// <summary>
    /// Gets a paginated list of files.
    /// </summary>
    /// <param name="pageNumber">The page number (1-based).</param>
    /// <param name="pageSize">The number of items per page.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A paginated collection of files.</returns>
    public async Task<IEnumerable<File>> GetPagedAsync(int pageNumber, int pageSize, CancellationToken cancellationToken = default)
    {
        if (pageNumber < 1)
        {
            pageNumber = 1;
        }

        if (pageSize < 1)
        {
            pageSize = 10;
        }

        return await _context.Files
            .AsNoTracking()
            .Include(f => f.UploadedBy)
            .OrderByDescending(f => f.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }
}