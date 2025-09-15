using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using PolishFootballNetwork.Application.Common.Implementation;
using PolishFootballNetwork.Application.Common.Interfaces;
using System.Reflection;

namespace PolishFootballNetwork.Application;

/// <summary>
/// Extension methods for configuring application services.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Adds application services to the dependency injection container.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        // Register mediator
        services.AddScoped<IMediator, SimpleMediator>();

        // Register all command handlers
        RegisterCommandHandlers(services, assembly);

        // Register all query handlers
        RegisterQueryHandlers(services, assembly);

        // Register FluentValidation validators
        services.AddValidatorsFromAssembly(assembly);

        // Register application services (these will be implemented in Infrastructure)
        // services.AddScoped<IFileService, FileService>();
        // services.AddScoped<IAuthenticationService, AuthenticationService>();
        // services.AddScoped<ICacheService, CacheService>();

        return services;
    }

    private static void RegisterCommandHandlers(IServiceCollection services, Assembly assembly)
    {
        // Get all command handler types
        var commandHandlerTypes = assembly.GetTypes()
            .Where(t => t.GetInterfaces()
                .Any(i => i.IsGenericType && 
                         (i.GetGenericTypeDefinition() == typeof(ICommandHandler<,>) ||
                          i.GetGenericTypeDefinition() == typeof(ICommandHandler<>))))
            .Where(t => !t.IsAbstract && !t.IsInterface)
            .ToList();

        foreach (var handlerType in commandHandlerTypes)
        {
            var interfaces = handlerType.GetInterfaces()
                .Where(i => i.IsGenericType && 
                           (i.GetGenericTypeDefinition() == typeof(ICommandHandler<,>) ||
                            i.GetGenericTypeDefinition() == typeof(ICommandHandler<>)))
                .ToList();

            foreach (var interfaceType in interfaces)
            {
                services.AddScoped(interfaceType, handlerType);
            }
        }
    }

    private static void RegisterQueryHandlers(IServiceCollection services, Assembly assembly)
    {
        // Get all query handler types
        var queryHandlerTypes = assembly.GetTypes()
            .Where(t => t.GetInterfaces()
                .Any(i => i.IsGenericType && 
                         i.GetGenericTypeDefinition() == typeof(IQueryHandler<,>)))
            .Where(t => !t.IsAbstract && !t.IsInterface)
            .ToList();

        foreach (var handlerType in queryHandlerTypes)
        {
            var interfaces = handlerType.GetInterfaces()
                .Where(i => i.IsGenericType && 
                           i.GetGenericTypeDefinition() == typeof(IQueryHandler<,>))
                .ToList();

            foreach (var interfaceType in interfaces)
            {
                services.AddScoped(interfaceType, handlerType);
            }
        }
    }
}
