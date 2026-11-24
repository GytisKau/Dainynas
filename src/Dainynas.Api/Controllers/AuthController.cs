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
using Dainynas.Api.Services;

namespace Dainynas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class AuthController(
    DainynasDbContext context,
    IPasswordHasher<User> passwordHasher,
    TokenService tokenService,
    IWebHostEnvironment environment) : ControllerBase
{
    private const string RefreshCookieName = "dainynas.refresh";

    private readonly DainynasDbContext _context = context;
    private readonly IPasswordHasher<User> _passwordHasher = passwordHasher;
    private readonly TokenService _tokenService = tokenService;
    private readonly IWebHostEnvironment _environment = environment;

    private CookieOptions RefreshCookieOptions() => new()
    {
        HttpOnly = true,
        Secure = !_environment.IsDevelopment() || Request.IsHttps,
        SameSite = SameSiteMode.Strict,
        Path = "/api"
    };

    private void WriteRefreshCookie(string refreshToken)
    {
        Response.Cookies.Append(
            RefreshCookieName,
            refreshToken,
            RefreshCookieOptions());
    }

    private void ClearRefreshCookie()
    {
        Response.Cookies.Delete(RefreshCookieName, RefreshCookieOptions());
    }

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
            Role = UserRoles.User
        };

        user.PasswordHash = _passwordHasher.HashPassword(
            user,
            dto.Password
        );

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var response = await _tokenService.CreateTokenPairAsync(user);
        WriteRefreshCookie(response.RefreshToken);

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

        if (user.IsBlocked || 
            verificationResult == PasswordVerificationResult.Failed)
            return Unauthorized(new{ message = "Invalid email or password." });


        if (verificationResult ==
            PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _passwordHasher.HashPassword(
                user,
                dto.Password);

            await _context.SaveChangesAsync();
        }

        var response = await _tokenService.CreateTokenPairAsync(user);
        WriteRefreshCookie(response.RefreshToken);

        return Ok(response);
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


    [AllowAnonymous]
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public Task<ActionResult<AuthResponseDto>> Refresh(RefreshTokenDto dto)
    {
        return RotateRefreshTokenAsync(dto.RefreshToken, clearInvalidCookie: false);
    }

    [AllowAnonymous]
    [HttpPost("restore")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public Task<ActionResult<AuthResponseDto>> Restore()
    {
        if (Request.Headers["X-Dainynas-Request"] != "1")
        {
            return Task.FromResult<ActionResult<AuthResponseDto>>(BadRequest());
        }

        if (!Request.Cookies.TryGetValue(RefreshCookieName, out var refreshToken))
        {
            return Task.FromResult<ActionResult<AuthResponseDto>>(NoContent());
        }

        return RotateRefreshTokenAsync(refreshToken, clearInvalidCookie: true);
    }

    private async Task<ActionResult<AuthResponseDto>> RotateRefreshTokenAsync(
        string refreshToken,
        bool clearInvalidCookie)
    {
        var response = await _tokenService.RefreshAsync(refreshToken);

        if (response is null)
        {
            if (clearInvalidCookie)
                ClearRefreshCookie();

            return Unauthorized(new
            {
                message = "Invalid or expired refresh token."
            });
        }

        WriteRefreshCookie(response.RefreshToken);

        return Ok(response);
    }


    [Authorize]
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout()
    {
        var sessionClaim = User.FindFirstValue("session_id");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(sessionClaim, out var sessionId) ||
            !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        await _tokenService.RevokeSessionAsync(sessionId, userId);
        ClearRefreshCookie();

        return NoContent();
    }

}