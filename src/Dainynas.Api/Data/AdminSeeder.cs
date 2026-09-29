using Dainynas.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Dainynas.Api.Data;

public static class AdminSeeder
{
    public static async Task SeedAsync(
        IServiceProvider services,
        IConfiguration configuration)
    {
        var dbContext = services.GetRequiredService<DainynasDbContext>();
        var passwordHasher =
            services.GetRequiredService<IPasswordHasher<User>>();

        var adminEmail = configuration["Admin:Email"];
        var adminPassword = configuration["Admin:Password"];

        if (string.IsNullOrWhiteSpace(adminEmail) ||
            string.IsNullOrWhiteSpace(adminPassword))
        {
            throw new InvalidOperationException(
                "Admin seed configuration is missing."
            );
        }

        var normalizedEmail = adminEmail.Trim().ToLowerInvariant();

        var existingAdmin = await dbContext.Users
            .FirstOrDefaultAsync(user =>
                user.Email == normalizedEmail);

        if (existingAdmin is not null)
        {
            return;
        }

        var admin = new User
        {
            Email = normalizedEmail,
            PasswordHash = string.Empty,
            Role = "Admin"
        };

        admin.PasswordHash =
            passwordHasher.HashPassword(
                admin,
                adminPassword
            );

        dbContext.Users.Add(admin);

        await dbContext.SaveChangesAsync();
    }
}