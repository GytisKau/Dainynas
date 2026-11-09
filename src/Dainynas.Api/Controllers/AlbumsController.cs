
using System.Security.Claims;
using System.Text.Json;
using Dainynas.Api.Data;
using Dainynas.Api.DTOs.Albums;
using Dainynas.Api.DTOs.Common;
using Dainynas.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

using Dainynas.Api.Extensions;
using Dainynas.Api.Helpers;

namespace Dainynas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AlbumsController(DainynasDbContext context) : ControllerBase
{
    private readonly DainynasDbContext _context = context;

    private static readonly JsonSerializerOptions ProposalOptions =
        new(JsonSerializerDefaults.Web);

    // ---------------- Helpers ----------------

    private static bool IsSongPublic(Song song) =>
        song.PublicationStatus == PublicationStatus.Published &&
        song.IsPublic &&
        song.Performer.PublicationStatus == PublicationStatus.Published;

    private bool CanRead(Album album) =>
        User.CanManage(album.OwnerId) ||
        (album.PublicationStatus == PublicationStatus.Published &&
         album.IsPublic &&
         album.AlbumSongs.All(x => IsSongPublic(x.Song)));

    private bool CanUseSong(Song song, int userId) =>
        User.IsModeratorOrAdmin() ||
        song.OwnerId == userId ||
        IsSongPublic(song);

    private IQueryable<Album> AlbumsWithSongs() =>
        _context.Albums
            .AsNoTracking()
            .Include(a => a.AlbumSongs)
                .ThenInclude(x => x.Song)
                    .ThenInclude(s => s.Performer)
            .AsSplitQuery();

    private IQueryable<Album> PublicAlbumsQuery() =>
        AlbumsWithSongs().Where(a =>
            a.PublicationStatus == PublicationStatus.Published &&
            a.IsPublic &&
            !a.AlbumSongs.Any(x =>
                x.Song.PublicationStatus != PublicationStatus.Published ||
                !x.Song.IsPublic ||
                x.Song.Performer.PublicationStatus !=
                    PublicationStatus.Published));

    private AlbumDto ToDto(Album album)
    {
        var userId = User.GetUserId();

        var dto = new AlbumDto
        {
            Id = album.Id,
            Title = album.Title,
            Description = album.Description,
            IsPublic = album.IsPublic,
            PublicationStatus = album.PublicationStatus
        };

        foreach (var entry in album.AlbumSongs.OrderBy(x => x.Position))
        {
            // Do not expose another user's private song.
            if (!User.IsModeratorOrAdmin() &&
                !IsSongPublic(entry.Song) &&
                (!userId.HasValue ||
                 entry.Song.OwnerId != userId.Value))
            {
                continue;
            }

            var song = new AlbumSongDto
            {
                Id = entry.SongId,
                Title = entry.Song.Title,
                Position = entry.Position
            };

            song.Links["song"] = new LinkDto
            {
                Href = $"/api/songs/{song.Id}"
            };

            dto.Songs.Add(song);
        }

        dto.Links["self"] = new LinkDto
        {
            Href = $"/api/albums/{album.Id}"
        };

        if (User.CanManage(album.OwnerId))
        {
            if (album.PublicationStatus != PublicationStatus.Pending)
            {
                dto.Links["update"] = new LinkDto
                {
                    Href = $"/api/albums/{album.Id}",
                    Method = "PUT"
                };
            }

            if (album.PublicationStatus == PublicationStatus.Draft)
            {
                dto.Links["submit"] = new LinkDto
                {
                    Href = $"/api/albums/{album.Id}/submit",
                    Method = "POST"
                };

                dto.Links["delete"] = new LinkDto
                {
                    Href = $"/api/albums/{album.Id}",
                    Method = "DELETE"
                };
            }

            if (album.PublicationStatus == PublicationStatus.Published)
            {
                dto.Links["unpublish"] = new LinkDto
                {
                    Href = $"/api/albums/{album.Id}/unpublish",
                    Method = "POST"
                };
            }
        }

        return dto;
    }

    // Validate references and access to referenced songs.
    private async Task<string?> ValidateSongIds(
        IReadOnlyList<int> ids,
        int userId,
        bool requirePublished)
    {
        if (ids.Count != ids.Distinct().Count())
            return "Album contains duplicate song IDs.";

        if (ids.Any(id => id <= 0))
            return "Song IDs must be positive.";

        var idArray = ids.ToArray();

        var songs = await _context.Songs
            .AsNoTracking()
            .Include(s => s.Performer)
            .Where(s => idArray.Contains(s.Id))
            .ToListAsync();

        if (songs.Count != ids.Count)
            return "Some referenced songs do not exist.";

        if (songs.Any(s => !CanUseSong(s, userId)))
            return "Some songs are not accessible.";

        if (requirePublished &&
            songs.Any(s => !IsSongPublic(s)))
        {
            return "Public albums require published, public songs.";
        }

        return null;
    }

    // Update relationships without removing and re-adding
    // unchanged AlbumSong composite primary keys.
    private void ReplaceAlbumSongs(
        Album album,
        IReadOnlyList<int> songIds)
    {
        var desired = songIds.ToHashSet();

        foreach (var existing in album.AlbumSongs.ToList())
        {
            if (!desired.Contains(existing.SongId))
            {
                _context.AlbumSongs.Remove(existing);
                album.AlbumSongs.Remove(existing);
            }
        }

        for (var i = 0; i < songIds.Count; i++)
        {
            var songId = songIds[i];

            var existing = album.AlbumSongs
                .FirstOrDefault(x => x.SongId == songId);

            if (existing is not null)
            {
                existing.Position = i + 1;
            }
            else
            {
                album.AlbumSongs.Add(new AlbumSong
                {
                    AlbumId = album.Id,
                    SongId = songId,
                    Position = i + 1
                });
            }
        }
    }

    // ---------------- GET LIST ----------------

    [HttpGet]
    [ProducesResponseType(
        typeof(PagedResponse<AlbumDto>),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<AlbumDto>>> GetAll(
        string? title = null,
        int page = 1,
        int pageSize = 10)
    {
        if (!PaginationHelper.IsValid(page, pageSize))
            return BadRequest(new { message = "Invalid pagination." });

        var query = PublicAlbumsQuery();

        if (!string.IsNullOrWhiteSpace(title))
            query = query.Where(a =>
                EF.Functions.ILike(a.Title, $"%{title.Trim()}%"));

        var result = await PaginationHelper.PaginateAsync(
            query.OrderBy(a => a.Id),
            page, pageSize);

        return Ok(new PagedResponse<AlbumDto>
        {
            Items = [.. result.Items.Select(ToDto)],
            Page = result.Page,
            PageSize = result.PageSize,
            TotalItems = result.TotalItems,
            TotalPages = result.TotalPages
        });
    }

    // ---------------- GET MINE ----------------

    [Authorize]
    [HttpGet("mine")]
    [ProducesResponseType(
        typeof(PagedResponse<AlbumDto>),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<AlbumDto>>> GetMine(
        int page = 1,
        int pageSize = 10)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        if (!PaginationHelper.IsValid(page, pageSize))
            return BadRequest(new { message = "Invalid pagination." });

        var query = AlbumsWithSongs()
            .Where(a => a.OwnerId == userId.Value);

        var result = await PaginationHelper.PaginateAsync(
            query.OrderByDescending(a => a.Id),
            page,
            pageSize);
            
        return Ok(new PagedResponse<AlbumDto>
        {
            Items = result.Items.Select(ToDto).ToList(),
            Page = result.Page,
            PageSize = result.PageSize,
            TotalItems = result.TotalItems,
            TotalPages = result.TotalPages
        });
    }

    // ---------------- GET BY ID ----------------

    [HttpGet("{id:int}")]
    [ProducesResponseType(
        typeof(AlbumDto),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AlbumDto>> GetById(int id)
    {
        var album = await AlbumsWithSongs()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (album is null || !CanRead(album))
            return NotFound();

        return Ok(ToDto(album));
    }

    // ---------------- CREATE ----------------

    [Authorize]
    [HttpPost]
    [ProducesResponseType(
        typeof(AlbumDto),
        StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AlbumDto>> Create(
        CreateAlbumDto dto)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Title is required." });

        var ids = dto.SongIds ?? [];

        var error = await ValidateSongIds(
            ids, userId.Value, requirePublished: false);

        if (error is not null)
            return BadRequest(new { message = error });

        var album = new Album
        {
            Title = dto.Title.Trim(),
            Description = dto.Description,
            IsPublic = dto.IsPublic,
            OwnerId = userId.Value,
            PublicationStatus = PublicationStatus.Draft,

            AlbumSongs = ids
                .Select((songId, index) => new AlbumSong
                {
                    SongId = songId,
                    Position = index + 1
                })
                .ToList()
        };

        _context.Albums.Add(album);
        await _context.SaveChangesAsync();

        var saved = await AlbumsWithSongs()
            .FirstAsync(a => a.Id == album.Id);

        return CreatedAtAction(
            nameof(GetById),
            new { id = album.Id },
            ToDto(saved));
    }

    // ---------------- UPDATE ----------------

    [Authorize]
    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        int id,
        UpdateAlbumDto dto)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Title is required." });

        dto.Title = dto.Title.Trim();

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var album = await _context.Albums
            .FromSqlInterpolated($"""
                SELECT * FROM "Albums"
                WHERE "Id" = {id}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync();

        if (album is null)
            return NotFound();

        if (!User.CanManage(album.OwnerId))
            return Forbid();

        if (album.PublicationStatus == PublicationStatus.Pending)
        {
            return Conflict(new
            {
                message = "Album is awaiting moderation."
            });
        }

        var ids = dto.SongIds ?? [];

        var error = await ValidateSongIds(
            ids,
            userId.Value,
            requirePublished:
                album.PublicationStatus == PublicationStatus.Published
                && dto.IsPublic);

        if (error is not null)
            return BadRequest(new { message = error });

        if (album.PublicationStatus == PublicationStatus.Draft)
        {
            await _context.Entry(album)
                .Collection(a => a.AlbumSongs)
                .LoadAsync();

            album.Title = dto.Title;
            album.Description = dto.Description;
            album.IsPublic = dto.IsPublic;

            ReplaceAlbumSongs(album, ids);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return NoContent();
        }

        if (album.PublicationStatus != PublicationStatus.Published)
        {
            return Conflict(new
            {
                message = "Unknown publication status."
            });
        }

        var hasPending = await _context.ModerationRequests
            .AnyAsync(r =>
                r.EntityType == ModerationEntityTypes.Album &&
                r.EntityId == id &&
                r.Status == ModerationStatuses.Pending);

        if (hasPending)
        {
            return Conflict(new
            {
                message = "A moderation request already exists."
            });
        }

        // Published album remains unchanged.
        var request = new ModerationRequest
        {
            EntityType = ModerationEntityTypes.Album,
            EntityId = album.Id,
            RequestType = ModerationRequestTypes.Update,
            Status = ModerationStatuses.Pending,
            ProposedDataJson = JsonSerializer.Serialize(
                dto, ProposalOptions),
            SubmittedByUserId = userId.Value,
            SubmittedAt = DateTime.UtcNow
        };

        _context.ModerationRequests.Add(request);

        try
        {
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException
            {
                SqlState: PostgresErrorCodes.UniqueViolation
            })
        {
            return Conflict(new
            {
                message = "A moderation request already exists."
            });
        }

        return Accepted(new
        {
            requestId = request.Id,
            status = request.Status,
            message = "Album changes are awaiting moderation."
        });
    }

    // ---------------- SUBMIT ----------------

    [Authorize]
    [HttpPost("{id:int}/submit")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Submit(int id)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var album = await _context.Albums
            .FromSqlInterpolated($"""
                SELECT * FROM "Albums"
                WHERE "Id" = {id}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync();

        if (album is null)
            return NotFound();

        if (!User.CanManage(album.OwnerId))
            return Forbid();

        if (album.PublicationStatus != PublicationStatus.Draft)
        {
            return Conflict(new
            {
                message = "Only drafts can be submitted."
            });
        }

        if (album.IsPublic)
        {
            var hasInvalidSongs = await _context.AlbumSongs
                .Where(x => x.AlbumId == id)
                .AnyAsync(x =>
                    x.Song.PublicationStatus !=
                        PublicationStatus.Published ||
                    !x.Song.IsPublic ||
                    x.Song.Performer.PublicationStatus !=
                        PublicationStatus.Published);

            if (hasInvalidSongs)
            {
                return Conflict(new
                {
                    message =
                        "Publish all referenced songs before the album."
                });
            }
        }

        var hasPending = await _context.ModerationRequests
            .AnyAsync(r =>
                r.EntityType == ModerationEntityTypes.Album &&
                r.EntityId == id &&
                r.Status == ModerationStatuses.Pending);

        if (hasPending)
        {
            return Conflict(new
            {
                message = "A moderation request already exists."
            });
        }

        album.PublicationStatus = PublicationStatus.Pending;

        var request = new ModerationRequest
        {
            EntityType = ModerationEntityTypes.Album,
            EntityId = album.Id,
            RequestType = ModerationRequestTypes.Publish,
            Status = ModerationStatuses.Pending,
            SubmittedByUserId = userId.Value,
            SubmittedAt = DateTime.UtcNow
        };

        _context.ModerationRequests.Add(request);

        try
        {
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException
            {
                SqlState: PostgresErrorCodes.UniqueViolation
            })
        {
            return Conflict(new
            {
                message = "A moderation request already exists."
            });
        }

        return Accepted(new
        {
            requestId = request.Id,
            status = request.Status,
            message = "Album submitted for publication."
        });
    }
    
    [Authorize]
    [HttpPost("{id:int}/unpublish")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Unpublish(int id)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var album = await _context.Albums
            .FromSqlInterpolated($"""
                SELECT * FROM "Albums"
                WHERE "Id" = {id}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync();

        if (album is null)
            return NotFound();

        if (!User.CanManage(album.OwnerId))
            return Forbid();

        if (album.PublicationStatus != PublicationStatus.Published)
        {
            return Conflict(new
            {
                message = "Only published albums can be unpublished."
            });
        }

        var hasPending = await _context.ModerationRequests
            .AnyAsync(r =>
                r.EntityType == ModerationEntityTypes.Album &&
                r.EntityId == id &&
                r.Status == ModerationStatuses.Pending);

        if (hasPending)
        {
            return Conflict(new
            {
                message =
                    "Resolve the pending moderation request first."
            });
        }

        album.IsPublic = false;
        album.PublicationStatus = PublicationStatus.Draft;

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return NoContent();
    }

    // ---------------- DELETE ----------------

    [Authorize]
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var album = await _context.Albums
            .FromSqlInterpolated($"""
                SELECT * FROM "Albums"
                WHERE "Id" = {id}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync();

        if (album is null)
            return NotFound();

        if (!User.CanManage(album.OwnerId))
            return Forbid();

        if (album.PublicationStatus != PublicationStatus.Draft)
        {
            return Conflict(new
            {
                message = "Only unpublished drafts can be deleted."
            });
        }

        var hasHistory = await _context.ModerationRequests
            .AnyAsync(r =>
                r.EntityType == ModerationEntityTypes.Album &&
                r.EntityId == id);

        if (hasHistory)
        {
            return Conflict(new
            {
                message = "Album has moderation history."
            });
        }

        await _context.Entry(album)
            .Collection(a => a.AlbumSongs)
            .LoadAsync();

        _context.AlbumSongs.RemoveRange(album.AlbumSongs);
        _context.Albums.Remove(album);

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return NoContent();
    }
}
