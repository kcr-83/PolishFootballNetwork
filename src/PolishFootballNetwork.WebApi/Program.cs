using Microsoft.OpenApi.Models;
using PolishFootballNetwork.Application;
using PolishFootballNetwork.Infrastructure;
using PolishFootballNetwork.Infrastructure.Logging;
using PolishFootballNetwork.Persistence;
using PolishFootballNetwork.WebApi.Endpoints;
using PolishFootballNetwork.WebApi.Extensions;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Add Serilog logging
builder.Host.AddSerilog(builder.Configuration);

// Add services to the container
builder.Services.AddApplicationServices();
builder.Services.AddPersistenceServices(builder.Configuration);
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddWebApiServices(builder.Configuration);
builder.Services.AddWebApiCoreServices(builder.Configuration);

// Add response caching and compression for public API
builder.Services.AddCachingAndCompression();

// Add Serilog request logging
builder.Services.AddSerilogRequestLogging();

// Add OpenAPI/Swagger
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // Main API documentation
    options.SwaggerDoc("v1", new()
    {
        Title = "Polish Football Network API",
        Version = "v1",
        Description = "Public API for accessing Polish football club data and connections. " +
                     "Provides endpoints for retrieving club information, connections between clubs, " +
                     "and graph visualization data with optimized caching and performance.",
        Contact = new()
        {
            Name = "Polish Football Network",
            Email = "contact@polishfootballnetwork.com",
            Url = new("https://github.com/polishfootballnetwork"),
        },
        License = new()
        {
            Name = "MIT",
            Url = new("https://opensource.org/licenses/MIT"),
        },
        TermsOfService = new("https://polishfootballnetwork.com/terms"),
    });

    // Authentication schemes
    options.AddSecurityDefinition("Bearer", new()
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
    });

    options.AddSecurityRequirement(new()
    {
        {
            new()
            {
                Reference = new()
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer",
                },
            },
            Array.Empty<string>()
        },
    });

    // Add XML comments if available
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }

    // Add XML comments for referenced assemblies
    var applicationXmlFile = "PolishFootballNetwork.Application.xml";
    var applicationXmlPath = Path.Combine(AppContext.BaseDirectory, applicationXmlFile);
    if (File.Exists(applicationXmlPath))
    {
        options.IncludeXmlComments(applicationXmlPath);
    }

    var domainXmlFile = "PolishFootballNetwork.Domain.xml";
    var domainXmlPath = Path.Combine(AppContext.BaseDirectory, domainXmlFile);
    if (File.Exists(domainXmlPath))
    {
        options.IncludeXmlComments(domainXmlPath);
    }

    // Group endpoints by tags for better organization
    options.TagActionsBy(api => new[] { api.GroupName ?? "Default" });
    options.DocInclusionPredicate((name, api) => true);

    // Enhanced documentation features
    options.UseInlineDefinitionsForEnums();
    
    // Custom schema filters
    options.SupportNonNullableReferenceTypes();
    options.UseOneOfForPolymorphism();
    
    // Custom operation ID generator
    options.CustomOperationIds(e => $"{e.ActionDescriptor.RouteValues["controller"]}_{e.ActionDescriptor.RouteValues["action"]}");
});

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Add Serilog request logging
app.UseSerilogRequestLogging();

// Configure middleware pipeline with security features
app.UseCustomMiddleware();

// Add caching and compression middleware for public API
app.UseCachingAndCompression();

app.UseHttpsRedirection();
app.UseCors("AllowAngularApp");

// Add authentication and authorization
app.UseAuthentication();
app.UseAuthorization();

// Map health checks
app.MapHealthChecks("/health");

// Map authentication endpoints
app.MapGroup("/api/auth").MapAuthEndpoints();

// Map user management endpoints (role-based authorization examples)
app.MapGroup("/api/users").MapUserEndpoints();

// Map public API endpoints for graph visualization
app.MapGroup("/api/clubs")
    .MapClubsEndpoints()
    .WithTags("Clubs")
    .WithOpenApi();

app.MapGroup("/api/connections")
    .MapConnectionsEndpoints()
    .WithTags("Connections")
    .WithOpenApi();

app.MapGroup("/api")
    .MapGraphEndpoints()
    .WithTags("Graph Visualization")
    .WithOpenApi();

// Sample endpoint - will be replaced with actual API endpoints
app.MapGet("/api/status", () => new { Status = "OK", Timestamp = DateTime.UtcNow })
    .WithName("GetStatus")
    .WithTags("System");

try
{
    Log.Information("Starting Polish Football Network API");
    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    await Log.CloseAndFlushAsync();
}
