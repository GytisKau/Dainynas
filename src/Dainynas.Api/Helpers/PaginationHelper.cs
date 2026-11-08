
using Dainynas.Api.DTOs.Common;
using Microsoft.EntityFrameworkCore;

namespace Dainynas.Api.Helpers;

public static class PaginationHelper
{
    public static bool IsValid(int page, int pageSize)
    {
        return page >= 1 &&
               pageSize is >= 1 and <= 100 &&
               (long)(page - 1) * pageSize <= int.MaxValue;
    }

    public static async Task<PagedResponse<T>> PaginateAsync<T>(
        IQueryable<T> orderedQuery, int page, int pageSize)
    {
        if (!IsValid(page, pageSize))
        {
            throw new ArgumentOutOfRangeException(
                nameof(page),
                "Invalid pagination parameters.");
        }

        var totalItems = await orderedQuery.CountAsync();

        var items = await orderedQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResponse<T>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
        };
    }
}
