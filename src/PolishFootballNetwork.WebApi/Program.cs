using PolishFootballNetwork.Application;
using PolishFootballNetwork.Infrastructure;
using PolishFootballNetwork.Infrastructure.Logging;
using PolishFootballNetwork.Persistence;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Add Serilog logging
builder.Host.AddSerilog(builder.Configuration);

// Add services to the container
builder.Services.AddApplicationServices();
builder.Services.AddPersistenceServices(builder.Configuration);
builder.Services.AddInfrastructureServices(builder.Configuration);

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

app.UseHttpsRedirection();
app.UseCors("AllowAngularApp");

// Add authentication and authorization
app.UseAuthentication();
app.UseAuthorization();

// Map health checks
app.MapHealthChecks("/health");

// Sample endpoint - will be replaced with actual API endpoints
app.MapGet("/api/status", () => new { Status = "OK", Timestamp = DateTime.UtcNow })
    .WithName("GetStatus")
    .WithTags("System");

try
{
    Log.Information("Starting Polish Football Network API");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
