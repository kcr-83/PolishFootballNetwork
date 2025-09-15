using Microsoft.Extensions.DependencyInjection;
using PolishFootballNetwork.Application.Common.Interfaces;

namespace PolishFootballNetwork.Application.Common.Implementation;

/// <summary>
/// Simple mediator implementation for dispatching commands and queries.
/// </summary>
public class SimpleMediator : IMediator
{
    private readonly IServiceProvider _serviceProvider;

    /// <summary>
    /// Initializes a new instance of the SimpleMediator class.
    /// </summary>
    /// <param name="serviceProvider">The service provider.</param>
    public SimpleMediator(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    /// <summary>
    /// Sends a command and returns the result.
    /// </summary>
    /// <typeparam name="TResult">The type of result returned by the command.</typeparam>
    /// <param name="command">The command to send.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The result of the command.</returns>
    public async Task<TResult> Send<TResult>(ICommand<TResult> command, CancellationToken cancellationToken = default)
    {
        var handlerType = typeof(ICommandHandler<,>).MakeGenericType(command.GetType(), typeof(TResult));
        var handler = _serviceProvider.GetRequiredService(handlerType);
        
        var method = handlerType.GetMethod("Handle");
        if (method == null)
            throw new InvalidOperationException($"Handle method not found for {handlerType.Name}");

        var result = method.Invoke(handler, new object[] { command, cancellationToken });
        if (result is Task<TResult> task)
            return await task;

        throw new InvalidOperationException($"Invalid return type from handler {handlerType.Name}");
    }

    /// <summary>
    /// Sends a command without expecting a result.
    /// </summary>
    /// <param name="command">The command to send.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task Send(ICommand command, CancellationToken cancellationToken = default)
    {
        var handlerType = typeof(ICommandHandler<>).MakeGenericType(command.GetType());
        var handler = _serviceProvider.GetRequiredService(handlerType);
        
        var method = handlerType.GetMethod("Handle");
        if (method == null)
            throw new InvalidOperationException($"Handle method not found for {handlerType.Name}");

        var result = method.Invoke(handler, new object[] { command, cancellationToken });
        if (result is Task task)
            await task;
        else
            throw new InvalidOperationException($"Invalid return type from handler {handlerType.Name}");
    }

    /// <summary>
    /// Sends a query and returns the result.
    /// </summary>
    /// <typeparam name="TResult">The type of result returned by the query.</typeparam>
    /// <param name="query">The query to send.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The result of the query.</returns>
    public async Task<TResult> Send<TResult>(IQuery<TResult> query, CancellationToken cancellationToken = default)
    {
        var handlerType = typeof(IQueryHandler<,>).MakeGenericType(query.GetType(), typeof(TResult));
        var handler = _serviceProvider.GetRequiredService(handlerType);
        
        var method = handlerType.GetMethod("Handle");
        if (method == null)
            throw new InvalidOperationException($"Handle method not found for {handlerType.Name}");

        var result = method.Invoke(handler, new object[] { query, cancellationToken });
        if (result is Task<TResult> task)
            return await task;

        throw new InvalidOperationException($"Invalid return type from handler {handlerType.Name}");
    }
}
