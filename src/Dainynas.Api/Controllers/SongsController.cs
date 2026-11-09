
using System.Security.Claims;
using System.Text.Json;
using Dainynas.Api.Data;
using Dainynas.Api.DTOs.Common;
using Dainynas.Api.DTOs.Songs;
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
public class SongsController(DainynasDbContext context) : ControllerBase
{
    private readonly DainynasDbContext _context = context;

    private static readonly JsonSerializerOptions ProposalOptions =
        new(JsonSerializerDefaults.Web);

    // --------------------------------------------------
    // Helpers
    // --------------------------------------------------


    private bool CanRead(Song song)
    {
        if (User.CanManage(song.OwnerId))
            return true;

        return song.PublicationStatus ==
                   PublicationStatus.Published &&
               song.Performer.PublicationStatus ==
                   PublicationStatus.Published;
    }

    private bool CanUsePerformer(
        Performer performer,
        int userId)
    {
        return performer.PublicationStatus ==
                   PublicationStatus.Published ||
               User.IsModeratorOrAdmin() ||
               performer.OwnerId == userId;
    }

    private SongDto ToDto(
        Song song,
        string performerName)
    {
        var dto = new SongDto
        {
            Id = song.Id,
            Title = song.Title,
            Lyrics = song.Lyrics,
            RecordingYear = song.RecordingYear,
            RecordingPlace = song.RecordingPlace,
            ExternalArchiveUrl = song.ExternalArchiveUrl,
            AudioUrl = song.AudioUrl,
            PerformerId = song.PerformerId,
            PerformerName = performerName,
            PublicationStatus = song.PublicationStatus
        };

        dto.Links["self"] = new LinkDto
        {
            Href = $"/api/songs/{song.Id}"
        };

        dto.Links["performer"] = new LinkDto
        {
            Href = $"/api/performers/{song.PerformerId}"
        };

        dto.Links["comments"] = new LinkDto
        {
            Href =
                $"/api/performers/{song.PerformerId}" +
                $"/songs/{song.Id}/comments"
        };

        if (User.CanManage(song.OwnerId))
        {
            if (song.PublicationStatus != PublicationStatus.Pending)
            {
                dto.Links["update"] = new LinkDto
                {
                    Href = $"/api/songs/{song.Id}",
                    Method = "PUT"
                };
            }

            if (song.PublicationStatus == PublicationStatus.Draft)
            {
                dto.Links["submit"] = new LinkDto
                {
                    Href = $"/api/songs/{song.Id}/submit",
                    Method = "POST"
                };

                dto.Links["delete"] = new LinkDto
                {
                    Href = $"/api/songs/{song.Id}",
                    Method = "DELETE"
                };
            }

            if (song.PublicationStatus == PublicationStatus.Published)
            {
                dto.Links["unpublish"] = new LinkDto
                {
                    Href = $"/api/songs/{song.Id}/unpublish",
                    Method = "POST"
                };
            }
        }

        return dto;
    }

    private IQueryable<Song> PublicSongsQuery()
    {
        return _context.Songs
            .AsNoTracking()
            .Include(s => s.Performer)
            .Where(s =>
                s.PublicationStatus ==
                    PublicationStatus.Published &&
                s.Performer.PublicationStatus ==
                    PublicationStatus.Published);
    }

    // --------------------------------------------------
    // GET /api/songs
    // Public songs, filters and pagination
    // --------------------------------------------------

    [HttpGet]
    [ProducesResponseType(
        typeof(PagedResponse<SongDto>),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<SongDto>>> GetAll(
        string? title = null,
        int? year = null,
        int? performerId = null,
        int page = 1,
        int pageSize = 10)
    {
        if (!PaginationHelper.IsValid(page, pageSize))
            return BadRequest(new { message = "Invalid pagination."});

        var query = PublicSongsQuery();

        if (!string.IsNullOrWhiteSpace(title))
            query = query.Where(s =>
                EF.Functions.ILike(s.Title, $"%{title.Trim()}%"));

        if (year.HasValue)
            query = query.Where(s =>
                s.RecordingYear == year.Value);

        if (performerId.HasValue)
            query = query.Where(s =>
                s.PerformerId == performerId.Value);

        var result = await PaginationHelper.PaginateAsync(
            query.OrderBy(s => s.Id),
            page,
            pageSize);

        return Ok(new PagedResponse<SongDto>
        {
            Items = [.. result.Items.Select(s => ToDto(s, s.Performer.Name))],
            Page = result.Page,
            PageSize = result.PageSize,
            TotalItems = result.TotalItems,
            TotalPages = result.TotalPages
        });
    }

    // --------------------------------------------------
    // GET /api/songs/mine
    // All songs belonging to the current user
    // --------------------------------------------------

    [Authorize]
    [HttpGet("mine")]
    [ProducesResponseType(
        typeof(PagedResponse<SongDto>),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PagedResponse<SongDto>>> GetMine(
        int page = 1,
        int pageSize = 10)
    {
        var userId = User.GetUserId();

        if (userId is null)
            return Unauthorized();

        if (!PaginationHelper.IsValid(page, pageSize))
            return BadRequest(new { message = "Invalid pagination." });

        var query = _context.Songs
            .AsNoTracking()
            .Include(s => s.Performer)
            .Where(s => s.OwnerId == userId.Value)
            .OrderByDescending(s => s.Id);

        var result = await PaginationHelper.PaginateAsync(
            query,
            page,
            pageSize);

        return Ok(new PagedResponse<SongDto>
        {
            Items = [.. result.Items.Select(s => ToDto(s, s.Performer.Name))],
            Page = result.Page,
            PageSize = result.PageSize,
            TotalItems = result.TotalItems,
            TotalPages = result.TotalPages
        });
    }

    // --------------------------------------------------
    // GET /api/songs/{id}
    // --------------------------------------------------

    [HttpGet("{id:int}")]
    [ProducesResponseType(
        typeof(SongDto),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SongDto>> GetById(int id)
    {
        var song = await _context.Songs
            .AsNoTracking()
            .Include(s => s.Performer)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (song is null || !CanRead(song))
            return NotFound();

        return Ok(ToDto(song, song.Performer.Name));
    }

    // --------------------------------------------------
    // POST /api/songs
    // New song is always a draft
    // --------------------------------------------------

    [Authorize]
    [HttpPost]
    [ProducesResponseType(
        typeof(SongDto),
        StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SongDto>> Create(
        CreateSongDto dto)
    {
        var userId = User.GetUserId();

        if (userId is null)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            return BadRequest(new
            {
                message = "Title is required."
            });
        }

        var performer = await _context.Performers
            .FindAsync(dto.PerformerId);

        if (performer is null)
        {
            return BadRequest(new
            {
                message =
                    $"Performer {dto.PerformerId} does not exist."
            });
        }

        if (!CanUsePerformer(performer, userId.Value))
            return NotFound();

        var song = new Song
        {
            Title = dto.Title.Trim(),
            Lyrics = dto.Lyrics,
            RecordingYear = dto.RecordingYear,
            RecordingPlace = dto.RecordingPlace,
            ExternalArchiveUrl = dto.ExternalArchiveUrl,
            AudioUrl = dto.AudioUrl,
            PerformerId = performer.Id,
            Performer = performer,
            OwnerId = userId.Value,
            PublicationStatus = PublicationStatus.Draft
        };

        _context.Songs.Add(song);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetById),
            new { id = song.Id },
            ToDto(song, performer.Name));
    }

    // --------------------------------------------------
    // PUT /api/songs/{id}
    //
    // Draft: update immediately -> 204
    // Published: moderation request -> 202
    // Pending: cannot modify -> 409
    // --------------------------------------------------

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
        UpdateSongDto dto)
    {
        var userId = User.GetUserId();

        if (userId is null)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            return BadRequest(new
            {
                message = "Title is required."
            });
        }

        dto.Title = dto.Title.Trim();

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var song = await _context.Songs
            .FromSqlInterpolated($"""
                SELECT * FROM "Songs"
                WHERE "Id" = {id}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync();

        if (song is null)
            return NotFound();

        if (!User.CanManage(song.OwnerId))
            return Forbid();

        if (song.PublicationStatus ==
            PublicationStatus.Pending)
        {
            return Conflict(new
            {
                message = "Song is awaiting moderation."
            });
        }

        var performer = await _context.Performers
            .FindAsync(dto.PerformerId);

        if (performer is null)
        {
            return BadRequest(new
            {
                message =
                    $"Performer {dto.PerformerId} does not exist."
            });
        }

        if (!CanUsePerformer(performer, userId.Value))
            return NotFound();

        if (song.PublicationStatus ==
            PublicationStatus.Draft)
        {
            song.Title = dto.Title;
            song.Lyrics = dto.Lyrics;
            song.RecordingYear = dto.RecordingYear;
            song.RecordingPlace = dto.RecordingPlace;
            song.ExternalArchiveUrl = dto.ExternalArchiveUrl;
            song.AudioUrl = dto.AudioUrl;
            song.PerformerId = dto.PerformerId;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return NoContent();
        }

        if (song.PublicationStatus != PublicationStatus.Published)
            return Conflict(new {
                message = "Unknown publication status."
            });

        if (performer.PublicationStatus != PublicationStatus.Published)
            return Conflict(new {
                message = "A public song requires a published performer."
            });

        var hasPending = await _context.ModerationRequests
            .AnyAsync(r =>
                r.EntityType == ModerationEntityTypes.Song &&
                r.EntityId == song.Id &&
                r.Status == ModerationStatuses.Pending);

        if (hasPending)
            return Conflict(new {
                message = "A moderation request already exists."
            });

        // Do not modify the published Song entity.
        // Store the proposed version separately.
        var request = new ModerationRequest
        {
            EntityType = ModerationEntityTypes.Song,
            EntityId = song.Id,
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
            return Conflict(new {
                message = "A moderation request already exists."
            });
        }

        return Accepted(new
        {
            requestId = request.Id,
            status = request.Status,
            message = "Proposed changes are awaiting moderation."
        });
    }

    // --------------------------------------------------
    // POST /api/songs/{id}/submit
    // Draft -> Pending
    // --------------------------------------------------

    [Authorize]
    [HttpPost("{id:int}/submit")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Submit(int id)
    {
        var userId = User.GetUserId();

        if (userId is null)
            return Unauthorized();

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var song = await _context.Songs
            .FromSqlInterpolated($"""
                SELECT * FROM "Songs"
                WHERE "Id" = {id}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync();

        if (song is null)
            return NotFound();

        if (!User.CanManage(song.OwnerId))
            return Forbid();

        if (song.PublicationStatus !=
            PublicationStatus.Draft)
        {
            return Conflict(new
            {
                message = "Only drafts can be submitted."
            });
        }

        var performer = await _context.Performers
            .FindAsync(song.PerformerId);

        if (performer is null)
        {
            return Conflict(new
            {
                message = "Song has no valid performer."
            });
        }

        if (performer.PublicationStatus != PublicationStatus.Published)
            return Conflict(new {
                message = "Publish the performer before submitting this song."
            });

        var hasPending = await _context.ModerationRequests
            .AnyAsync(r =>
                r.EntityType == ModerationEntityTypes.Song &&
                r.EntityId == song.Id &&
                r.Status == ModerationStatuses.Pending);

        if (hasPending)
            return Conflict(new {
                message = "A moderation request already exists."
            });

        song.PublicationStatus = PublicationStatus.Pending;

        var request = new ModerationRequest
        {
            EntityType = ModerationEntityTypes.Song,
            EntityId = song.Id,
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
            message = "Song submitted for publication."
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

        var song = await _context.Songs
            .FromSqlInterpolated($"""
                SELECT * FROM "Songs"
                WHERE "Id" = {id}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync();

        if (song is null)
            return NotFound();

        if (!User.CanManage(song.OwnerId))
            return Forbid();

        if (song.PublicationStatus != PublicationStatus.Published)
            return Conflict(new
            {
                message = "Only published songs can be unpublished."
            });

        var hasPending = await _context.ModerationRequests
            .AnyAsync(r =>
                r.EntityType == ModerationEntityTypes.Song &&
                r.EntityId == id &&
                r.Status == ModerationStatuses.Pending);

        if (hasPending)
            return Conflict(new {
                message = "Resolve the pending moderation request first."
            });

        var belongsToPublicAlbum = await _context.AlbumSongs
            .AnyAsync(x =>
                x.SongId == id &&
                x.Album.PublicationStatus == PublicationStatus.Published);

        if (belongsToPublicAlbum)
            return Conflict(new {
                message = "Cannot unpublish a song used by a public album."
            });

        song.PublicationStatus = PublicationStatus.Draft;

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return NoContent();
    }

    // --------------------------------------------------
    // DELETE /api/songs/{id}
    // Only a draft without dependencies or history
    // --------------------------------------------------

    [Authorize]
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var song = await _context.Songs
            .FromSqlInterpolated($"""
                SELECT * FROM "Songs"
                WHERE "Id" = {id}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync();

        if (song is null)
            return NotFound();

        if (!User.CanManage(song.OwnerId))
            return Forbid();

        if (song.PublicationStatus !=
            PublicationStatus.Draft)
        {
            return Conflict(new
            {
                message = "Only unpublished drafts can be deleted."
            });
        }

        var hasComments = await _context.Comments
            .AnyAsync(c => c.SongId == id);

        var belongsToAlbums = await _context.AlbumSongs
            .AnyAsync(a => a.SongId == id);

        var hasHistory = await _context.ModerationRequests
            .AnyAsync(r =>
                r.EntityType == ModerationEntityTypes.Song &&
                r.EntityId == id);

        if (hasComments || belongsToAlbums || hasHistory)
        {
            return Conflict(new
            {
                message =
                    "Song has comments, albums or moderation history."
            });
        }

        _context.Songs.Remove(song);

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return NoContent();
    }
}
