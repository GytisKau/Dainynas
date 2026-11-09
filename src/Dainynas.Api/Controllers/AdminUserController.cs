
using System.Data;
using Dainynas.Api.Data;
using Dainynas.Api.DTOs.Admin;
using Dainynas.Api.DTOs.Common;
using Dainynas.Api.Extensions;
using Dainynas.Api.Helpers;
using Dainynas.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Dainynas.Api.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = UserRoles.Admin)]
public class AdminUsersController(DainynasDbContext context) : ControllerBase
{
    private readonly DainynasDbContext _context = context;

    private static bool IsValidRole(string role) =>
        role is UserRoles.User or
                UserRoles.Moderator or
                UserRoles.Admin;

    private static bool IsSerializationFailure(Exception ex) =>
        ex is PostgresException {
            SqlState: PostgresErrorCodes.SerializationFailure
        } ||
        ex is DbUpdateException {
            InnerException: PostgresException {
                SqlState: PostgresErrorCodes.SerializationFailure
            }
        };

    // Immediately revoke all active sessions.
    private async Task<int> RevokeSessionsAsync(int userId)
    {
        var now = DateTime.UtcNow;

        return await _context.RefreshSessions
            .Where(s => s.UserId == userId &&
                        s.RevokedAt == null)
            .ExecuteUpdateAsync(setters =>
                setters.SetProperty(s => s.RevokedAt, now));
    }

    // GET /api/admin/users
    [HttpGet]
    public async Task<ActionResult<PagedResponse<AdminUserDto>>> GetAll(
        string? email = null,
        string? role = null,
        bool? isBlocked = null,
        int page = 1,
        int pageSize = 10)
    {
        if (!PaginationHelper.IsValid(page, pageSize))
            return BadRequest(new { message = "Invalid pagination." });

        var query = _context.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(email))
        {
            var search = email.Trim();
            query = query.Where(u =>
                EF.Functions.ILike(u.Email, $"%{search}%"));
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            var selectedRole = role.Trim();

            if (!IsValidRole(selectedRole))
                return BadRequest(new { message = "Invalid role." });

            query = query.Where(u => u.Role == selectedRole);
        }

        if (isBlocked.HasValue)
            query = query.Where(u =>
                u.IsBlocked == isBlocked.Value);

        var now = DateTime.UtcNow;

        var projectedQuery = query
            .OrderBy(u => u.Id)
            .Select(u => new AdminUserDto
            {
                Id = u.Id,
                Email = u.Email,
                Role = u.Role,
                IsBlocked = u.IsBlocked,
                ActiveSessions = u.RefreshSessions.Count(s =>
                    s.RevokedAt == null && s.ExpiresAt > now)
            });

        var result = await PaginationHelper.PaginateAsync(
            projectedQuery,
            page,
            pageSize);

        return Ok(result);
    }

    // GET /api/admin/users/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AdminUserDto>> GetById(int id)
    {
        var now = DateTime.UtcNow;

        var user = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new AdminUserDto
            {
                Id = u.Id,
                Email = u.Email,
                Role = u.Role,
                IsBlocked = u.IsBlocked,
                ActiveSessions = u.RefreshSessions.Count(s =>
                    s.RevokedAt == null && s.ExpiresAt > now)
            })
            .FirstOrDefaultAsync();

        if (user is null)
            return NotFound();

        return Ok(user);
    }

    // PUT /api/admin/users/{id}/role
    [HttpPut("{id:int}/role")]
    public async Task<IActionResult> ChangeRole(
        int id,
        ChangeUserRoleDto dto)
    {
        var newRole = dto.Role?.Trim();

        if (newRole is null || !IsValidRole(newRole))
            return BadRequest(new { message = "Invalid role." });

        if (User.GetUserId() == id)
            return Forbid();

        try
        {
            await using var transaction =
                await _context.Database.BeginTransactionAsync(
                    IsolationLevel.Serializable);

            var target = await _context.Users
                .FromSqlInterpolated($"""
                    SELECT * FROM "Users"
                    WHERE "Id" = {id}
                    FOR UPDATE
                    """)
                .SingleOrDefaultAsync();

            if (target is null)
                return NotFound();

            if (target.Role == newRole)
                return NoContent();

            // Never remove the last active administrator.
            if (target.Role == UserRoles.Admin &&
                !target.IsBlocked &&
                newRole != UserRoles.Admin)
            {
                var anotherAdmin = await _context.Users
                    .AnyAsync(u =>
                        u.Id != id &&
                        u.Role == UserRoles.Admin &&
                        !u.IsBlocked);

                if (!anotherAdmin)
                    return Conflict(new {
                        message = "Cannot remove the last active administrator."
                    });
            }

            target.Role = newRole;

            await _context.SaveChangesAsync();

            // Existing JWTs still contain the old role.
            await RevokeSessionsAsync(id);

            await transaction.CommitAsync();
            return NoContent();
        }
        catch (Exception ex) when (IsSerializationFailure(ex))
        {
            return Conflict(new {
                message = "Concurrent user update. Please retry."
            });
        }
    }

    // POST /api/admin/users/{id}/block
    [HttpPost("{id:int}/block")]
    public Task<IActionResult> Block(int id) => SetBlocked(id, blocked: true);

    // POST /api/admin/users/{id}/unblock
    [HttpPost("{id:int}/unblock")]
    public Task<IActionResult> Unblock(int id) => SetBlocked(id, blocked: false);

    private async Task<IActionResult> SetBlocked(
        int id,
        bool blocked)
    {
        if (User.GetUserId() == id)
            return Forbid();

        try
        {
            await using var transaction =
                await _context.Database.BeginTransactionAsync(
                    IsolationLevel.Serializable);

            var target = await _context.Users
                .FromSqlInterpolated($"""
                    SELECT * FROM "Users"
                    WHERE "Id" = {id}
                    FOR UPDATE
                    """)
                .SingleOrDefaultAsync();

            if (target is null)
                return NotFound();

            if (target.IsBlocked == blocked)
                return NoContent();

            // Never block the last active administrator.
            if (blocked &&
                target.Role == UserRoles.Admin &&
                !target.IsBlocked)
            {
                var anotherAdmin = await _context.Users
                    .AnyAsync(u =>
                        u.Id != id &&
                        u.Role == UserRoles.Admin &&
                        !u.IsBlocked);

                if (!anotherAdmin)
                {
                    return Conflict(new
                    {
                        message =
                            "Cannot block the last active administrator."
                    });
                }
            }

            target.IsBlocked = blocked;

            await _context.SaveChangesAsync();

            // Both blocking and unblocking revoke old sessions.
            // After unblocking, the user must log in again.
            await RevokeSessionsAsync(id);

            await transaction.CommitAsync();
            return NoContent();
        }
        catch (Exception ex) when (IsSerializationFailure(ex))
        {
            return Conflict(new {
                message = "Concurrent user update. Please retry."
            });
        }
    }

    // POST /api/admin/users/{id}/revoke-sessions
    [HttpPost("{id:int}/revoke-sessions")]
    public async Task<IActionResult> RevokeSessions(int id)
    {
        var exists = await _context.Users
            .AnyAsync(u => u.Id == id);

        if (!exists)
            return NotFound();

        await RevokeSessionsAsync(id);

        return NoContent();
    }
}
