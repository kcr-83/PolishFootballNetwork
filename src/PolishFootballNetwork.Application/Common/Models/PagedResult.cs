namespace PolishFootballNetwork.Application.Common.Models;

/// <summary>
/// Represents a paginated result set.
/// </summary>
/// <typeparam name="T">The type of items in the result set.</typeparam>
public class PagedResult<T>
{
    /// <summary>
    /// Gets or sets the items in the current page.
    /// </summary>
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();

    /// <summary>
    /// Gets or sets the current page number (1-based).
    /// </summary>
    public int Page { get; init; }

    /// <summary>
    /// Gets or sets the page size.
    /// </summary>
    public int PageSize { get; init; }

    /// <summary>
    /// Gets or sets the total number of items across all pages.
    /// </summary>
    public int TotalCount { get; init; }

    /// <summary>
    /// Gets the total number of pages.
    /// </summary>
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);

    /// <summary>
    /// Gets a value indicating whether there is a previous page.
    /// </summary>
    public bool HasPrevious => Page > 1;

    /// <summary>
    /// Gets a value indicating whether there is a next page.
    /// </summary>
    public bool HasNext => Page < TotalPages;

    /// <summary>
    /// Gets the number of items in the current page.
    /// </summary>
    public int Count => Items.Count;

    /// <summary>
    /// Creates a new paginated result.
    /// </summary>
    /// <param name="items">The items in the current page.</param>
    /// <param name="page">The current page number.</param>
    /// <param name="pageSize">The page size.</param>
    /// <param name="totalCount">The total number of items.</param>
    /// <returns>A new paginated result.</returns>
    public static PagedResult<T> Create(IReadOnlyList<T> items, int page, int pageSize, int totalCount)
        => new()
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };

    /// <summary>
    /// Creates an empty paginated result.
    /// </summary>
    /// <param name="page">The current page number.</param>
    /// <param name="pageSize">The page size.</param>
    /// <returns>An empty paginated result.</returns>
    public static PagedResult<T> Empty(int page, int pageSize)
        => new()
        {
            Items = Array.Empty<T>(),
            Page = page,
            PageSize = pageSize,
            TotalCount = 0
        };
}
