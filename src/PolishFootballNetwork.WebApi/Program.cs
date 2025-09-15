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
builder.Services.AddWebApiServices();

// Add Serilog request logging
builder.Services.AddSerilogRequestLogging();

// Add OpenAPI/Swagger
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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
