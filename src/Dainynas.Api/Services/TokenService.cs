
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Dainynas.Api.Data;
using Dainynas.Api.DTOs.Auth;
using Dainynas.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Dainynas.Api.Services;

public class TokenService(
    DainynasDbContext context,
    IConfiguration configuration)
{
    private readonly DainynasDbContext _context = context;
    private readonly IConfiguration _configuration = configuration;

    private static readonly TimeSpan AccessLifetime = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan RefreshLifetime = TimeSpan.FromDays(7);

    public static string HashRefreshToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    private static string GenerateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }

    public async Task<AuthResponseDto> CreateTokenPairAsync(User user)
    {
        var now = DateTime.UtcNow;
        var refreshToken = GenerateRefreshToken();

        var session = new RefreshSession
        {
            UserId = user.Id,
            TokenHash = HashRefreshToken(refreshToken),
            CreatedAt = now,
            ExpiresAt = now.Add(RefreshLifetime)
        };

        _context.RefreshSessions.Add(session);
        await _context.SaveChangesAsync();

        return BuildResponse(user, session.Id, refreshToken, session.ExpiresAt, now);
    }

    public AuthResponseDto BuildResponse(
        User user,
        Guid sessionId,
        string refreshToken,
        DateTime refreshExpiresAt,
        DateTime now)
    {
        var jwtKey = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "JWT key is missing.");

        var issuer = _configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException(
                "JWT issuer is missing.");

        var audience = _configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException(
                "JWT audience is missing.");

        var accessExpiresAt = now.Add(AccessLifetime);

        var claims = new[]
        {
            new Claim(
                ClaimTypes.NameIdentifier,
                user.Id.ToString()),

            new Claim(
                ClaimTypes.Email,
                user.Email),

            new Claim(
                ClaimTypes.Role,
                user.Role),

            new Claim(
                "session_id",
                sessionId.ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var jwt = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: now,
            expires: accessExpiresAt,
            signingCredentials: credentials);

        return new AuthResponseDto
        {
            Token = new JwtSecurityTokenHandler().WriteToken(jwt),

            RefreshToken = refreshToken,
            ExpiresAt = accessExpiresAt,
            RefreshExpiresAt = refreshExpiresAt,
            Role = user.Role
        };
    }

    public async Task<AuthResponseDto?> RefreshAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return null;
        }

        var hash = HashRefreshToken(refreshToken);
        var now = DateTime.UtcNow;

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var session = await _context.RefreshSessions
            .AsNoTracking()
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.TokenHash == hash);

        if (session is null ||
            session.RevokedAt != null ||
            session.ExpiresAt <= now)
        {
            return null;
        }

        // Atomic operation: only one request can revoke
        // this session successfully.
        var affectedRows = await _context.RefreshSessions
            .Where(s =>
                s.Id == session.Id &&
                s.RevokedAt == null &&
                s.ExpiresAt > now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(s => s.RevokedAt, now));

        if (affectedRows != 1)
        {
            return null;
        }

        var newRefreshToken = GenerateRefreshToken();

        var newSession = new RefreshSession
        {
            UserId = session.UserId,
            TokenHash = HashRefreshToken(newRefreshToken),
            CreatedAt = now,
            ExpiresAt = now.Add(RefreshLifetime)
        };

        _context.RefreshSessions.Add(newSession);
        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return BuildResponse(
            session.User,
            newSession.Id,
            newRefreshToken,
            newSession.ExpiresAt,
            now);
    }

    public async Task<bool> RevokeSessionAsync(
        Guid sessionId,
        int userId)
    {
        var now = DateTime.UtcNow;

        var affectedRows = await _context.RefreshSessions
            .Where(s =>
                s.Id == sessionId &&
                s.UserId == userId &&
                s.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(s => s.RevokedAt, now));

        return affectedRows == 1;
    }
}
