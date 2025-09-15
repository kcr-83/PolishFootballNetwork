using PolishFootballNetwork.Application.Common.Interfaces;
using PolishFootballNetwork.Persistence.Context;

namespace PolishFootballNetwork.Persistence;

/// <summary>
/// Unit of work implementation for managing database transactions
/// </summary>
public class UnitOfWork : IUnitOfWork
{
    private readonly FootballNetworkDbContext _context;

    /// <summary>
    /// Initializes a new instance of the <see cref="UnitOfWork"/> class
    /// </summary>
    /// <param name="context">The database context</param>
    public UnitOfWork(FootballNetworkDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <summary>
    /// Saves changes to the database asynchronously
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of affected records</returns>
    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Disposes the unit of work
    /// </summary>
    public void Dispose()
    {
        _context?.Dispose();
    }
}