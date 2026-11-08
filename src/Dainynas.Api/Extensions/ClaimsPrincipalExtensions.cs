
using System.Security.Claims;
using Dainynas.Api.Models;

namespace Dainynas.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static int? GetUserId(this ClaimsPrincipal user)
    {
        return int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
                ? id : null;
    }

    public static bool IsModeratorOrAdmin(this ClaimsPrincipal user)
    {
        return user.IsInRole(UserRoles.Moderator) ||
               user.IsInRole(UserRoles.Admin);
    }

    public static bool CanManage(this ClaimsPrincipal user, int? ownerId)
    {
        var userId = user.GetUserId();

        return user.IsModeratorOrAdmin() ||
            (userId.HasValue && ownerId == userId.Value);
    }
}
