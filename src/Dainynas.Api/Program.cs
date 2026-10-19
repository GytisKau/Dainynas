using Dainynas.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using Azure.Identity;
using Dainynas.Api.Data;
using Dainynas.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var useKeyVault =
    builder.Configuration.GetValue<bool>("UseKeyVault");

if (useKeyVault)
{
    var keyVaultUri = builder.Configuration["KeyVault:Uri"]
        ?? throw new InvalidOperationException(
            "KeyVault URI is missing."
        );

    builder.Configuration.AddAzureKeyVault(
        new Uri(keyVaultUri),
        new DefaultAzureCredential()
    );
}

builder.Services.AddControllers();

builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<TokenService>();

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException(
        "JWT key is missing.");

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException(
        "JWT issuer is missing.");

var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException(
        "JWT audience is missing.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)
            ),

            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,

            ValidateAudience = true,
            ValidAudience = jwtAudience,

            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,

            NameClaimType = ClaimTypes.Email,
            RoleClaimType = ClaimTypes.Role
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var sessionClaim =
                    context.Principal?.FindFirst("session_id")?.Value;

                var userIdClaim =
                    context.Principal?.FindFirst(
                        ClaimTypes.NameIdentifier)?.Value;

                if (!Guid.TryParse(sessionClaim, out var sessionId) ||
                    !int.TryParse(userIdClaim, out var userId))
                {
                    context.Fail("Invalid session claims.");
                    return;
                }

                var db = context.HttpContext.RequestServices
                    .GetRequiredService<DainynasDbContext>();

                var now = DateTime.UtcNow;

                var sessionIsActive =
                    await db.RefreshSessions.AnyAsync(s =>
                        s.Id == sessionId &&
                        s.UserId == userId &&
                        s.RevokedAt == null &&
                        s.ExpiresAt > now);

                if (!sessionIsActive)
                {
                    context.Fail("Session has expired or was revoked.");
                    return;
                }

                // Ensure current privileges have not changed.
                var tokenRole = context.Principal?
                    .FindFirst(ClaimTypes.Role)?.Value;

                var roleIsCurrent = await db.Users.AnyAsync(u =>
                    u.Id == userId &&
                    u.Role == tokenRole);

                if (!roleIsCurrent)
                {
                    context.Fail("User role has changed.");
                }
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddDbContext<DainynasDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    ));

builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider
        .GetRequiredService<DainynasDbContext>();

    dbContext.Database.Migrate();

    await DatabaseSeeder.SeedAsync(dbContext);

    await AdminSeeder.SeedAsync(
        scope.ServiceProvider,
        builder.Configuration
    );

    await ModeratorSeeder.SeedAsync(
        scope.ServiceProvider,
        builder.Configuration
    );
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
