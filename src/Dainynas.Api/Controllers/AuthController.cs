using Dainynas.Api.Data;
using Dainynas.Api.DTOs.Auth;
using Dainynas.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Dainynas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    DainynasDbContext context,
    IPasswordHasher<User> passwordHasher,
    IConfiguration configuration) : ControllerBase
{
    private readonly DainynasDbContext _context = context;
    private readonly IPasswordHasher<User> _passwordHasher = passwordHasher;
    private readonly IConfiguration _configuration = configuration;

    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        var exists = await _context.Users
            .AnyAsync(user => user.Email == normalizedEmail);

        if (exists) 
            return BadRequest( new { message = "User with this email already exists." });

        var user = new User
        {
            Email = normalizedEmail,
            PasswordHash = string.Empty,
            Role = "User"
        };

        user.PasswordHash = _passwordHasher.HashPassword(
            user,
            dto.Password
        );

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var response = CreateToken(user);

        return StatusCode(
            StatusCodes.Status201Created,
            response
        );
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        var user = await _context.Users
            .FirstOrDefaultAsync(user => user.Email == normalizedEmail);

        if (user is null)
            return Unauthorized(new{ message = "Invalid email or password." });

        var verificationResult =
            _passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                dto.Password
            );

        if (verificationResult == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new
            {
                message = "Invalid email or password."
            });
        }

        return Ok(CreateToken(user));
    }

    private AuthResponseDto CreateToken(User user)
    {
        var jwtKey = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT key is missing.");

        var expiresAt = DateTime.UtcNow.AddHours(1);

        var claims = new[]
        {
            new Claim(
                ClaimTypes.NameIdentifier,
                user.Id.ToString()
            ),
            new Claim(
                ClaimTypes.Email,
                user.Email
            ),
            new Claim(
                ClaimTypes.Role,
                user.Role
            )
        };

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtKey)
        );

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        return new AuthResponseDto
        {
            Token = new JwtSecurityTokenHandler()
                .WriteToken(token),

            ExpiresAt = expiresAt,

            Role = user.Role
        };
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        return Ok(new
        {
            id = User.FindFirstValue(ClaimTypes.NameIdentifier),
            email = User.FindFirstValue(ClaimTypes.Email),
            role = User.FindFirstValue(ClaimTypes.Role)
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin")]
    public IActionResult AdminOnly()
    {
        return Ok(new
        {
            message = "Admin access granted."
        });
    }
}