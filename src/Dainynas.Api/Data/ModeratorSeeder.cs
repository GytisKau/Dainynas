using Dainynas.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Dainynas.Api.Data;

public static class ModeratorSeeder
{
    public static async Task SeedAsync(
        IServiceProvider services,
        IConfiguration configuration)
    {
        var context = services.GetRequiredService<DainynasDbContext>();
        var passwordHasher =
            services.GetRequiredService<IPasswordHasher<User>>();

        var email = configuration["Moderator:Email"];
        var password = configuration["Moderator:Password"];

        if (string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "Moderator seed configuration is missing."
            );
        }

        email = email.Trim().ToLowerInvariant();

        var existingUser = await context.Users
            .FirstOrDefaultAsync(user => user.Email == email);

        if (existingUser is not null)
        {
            if (existingUser.Role != UserRoles.Moderator)
            {
                throw new InvalidOperationException(
                    "Moderator email belongs to a user with a different role.");
            }

            return;
        }

        var moderator = new User
        {
            Email = email,
            PasswordHash = string.Empty,
            Role = UserRoles.Moderator
        };

        moderator.PasswordHash = passwordHasher.HashPassword(
            moderator,
            password
        );

        context.Users.Add(moderator);
        await context.SaveChangesAsync();
    }
}
