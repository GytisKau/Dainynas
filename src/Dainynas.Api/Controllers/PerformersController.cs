
using System.Security.Claims;
using System.Text.Json;
using Dainynas.Api.Data;
using Dainynas.Api.DTOs.Common;
using Dainynas.Api.DTOs.Comments;
using Dainynas.Api.DTOs.Performers;
using Dainynas.Api.DTOs.Songs;
using Dainynas.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Dainynas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PerformersController(DainynasDbContext context) : ControllerBase
{
    private readonly DainynasDbContext _context = context;

    private static readonly JsonSerializerOptions ProposalOptions =
        new(JsonSerializerDefaults.Web);

    private int? CurrentUserId()
    {
        return int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out var id) ? id : null;
    }

    private bool IsModeratorOrAdmin() =>
        User.IsInRole(UserRoles.Moderator) ||
        User.IsInRole(UserRoles.Admin);

    private bool CanManage(Performer performer)
    {
        var userId = CurrentUserId();

        return IsModeratorOrAdmin() ||
            (userId.HasValue &&
             performer.OwnerId == userId.Value);
    }

    private bool CanRead(Performer performer) =>
        performer.PublicationStatus == PublicationStatus.Published ||
        CanManage(performer);

    private bool CanReadSong(Song song)
    {
        var userId = CurrentUserId();

        return IsModeratorOrAdmin() ||
            (song.PublicationStatus == PublicationStatus.Published &&
             song.IsPublic) ||
            (userId.HasValue && song.OwnerId == userId.Value);
    }

    private PerformerDto ToDto(Performer performer)
    {
        var dto = new PerformerDto
        {
            Id = performer.Id,
            Name = performer.Name,
            BirthYear = performer.BirthYear,
            Residence = performer.Residence,
            PhotoUrl = performer.PhotoUrl,
            PublicationStatus = performer.PublicationStatus
        };

        dto.Links["self"] = new LinkDto
        {
            Href = $"/api/performers/{performer.Id}"
        };

        dto.Links["songs"] = new LinkDto
        {
            Href = $"/api/performers/{performer.Id}/songs"
        };

        dto.Links["profile"] = new LinkDto
        {
            Href = $"/api/performers/{performer.Id}/profile"
        };

        if (CanManage(performer))
        {
            if (performer.PublicationStatus != PublicationStatus.Pending)
            {
                dto.Links["update"] = new LinkDto
                {
                    Href = $"/api/performers/{performer.Id}",
                    Method = "PUT"
                };
            }

            if (performer.PublicationStatus == PublicationStatus.Draft)
            {
                dto.Links["submit"] = new LinkDto
                {
                    Href = $"/api/performers/{performer.Id}/submit",
                    Method = "POST"
                };

                dto.Links["delete"] = new LinkDto
                {
                    Href = $"/api/performers/{performer.Id}",
                    Method = "DELETE"
                };
            }
        }

        return dto;
    }

    private static void AddSongLinks(SongDto song)
    {
        song.Links["self"] = new LinkDto
        {
            Href = $"/api/songs/{song.Id}"
        };

        song.Links["performer"] = new LinkDto
        {
            Href = $"/api/performers/{song.PerformerId}"
        };

        song.Links["comments"] = new LinkDto
        {
            Href = $"/api/performers/{song.PerformerId}" +
                   $"/songs/{song.Id}/comments"
        };
    }

    private static void AddCommentLinks(CommentDto comment)
    {
        comment.Links["self"] = new LinkDto
        {
            Href = $"/api/comments/{comment.Id}"
        };

        comment.Links["song"] = new LinkDto
        {
            Href = $"/api/songs/{comment.SongId}"
        };
    }

    // GET /api/performers
    // Public: only published performers.
    [HttpGet]
    [ProducesResponseType(
        typeof(PagedResponse<PerformerDto>),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<PerformerDto>>> GetAll(
        string? name = null,
        int page = 1,
        int pageSize = 10)
    {
        if (!ValidPagination(page, pageSize))
            return BadRequest(new { message = "Invalid pagination." });

        var query = _context.Performers
            .AsNoTracking()
            .Where(p => p.PublicationStatus == PublicationStatus.Published);

        if (!string.IsNullOrWhiteSpace(name))
        {
            query = query.Where(p =>
                p.Name.ToLower().Contains(name.ToLower()));
        }

        var total = await query.CountAsync();

        var performers = await query
            .OrderBy(p => p.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResponse<PerformerDto>
        {
            Items = performers.Select(ToDto).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalItems = total,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    // GET /api/performers/mine
    [Authorize]
    [HttpGet("mine")]
    public async Task<ActionResult<PagedResponse<PerformerDto>>> GetMine(
        int page = 1,
        int pageSize = 10)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        if (!ValidPagination(page, pageSize))
            return BadRequest(new { message = "Invalid pagination." });

        var query = _context.Performers
            .AsNoTracking()
            .Where(p => p.OwnerId == userId.Value);

        var total = await query.CountAsync();

        var performers = await query
            .OrderByDescending(p => p.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResponse<PerformerDto>
        {
            Items = performers.Select(ToDto).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalItems = total,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    // GET /api/performers/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PerformerDto>> GetById(int id)
    {
        var performer = await _context.Performers
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (performer is null || !CanRead(performer))
            return NotFound();

        return Ok(ToDto(performer));
    }

    // POST /api/performers
    [Authorize]
    [HttpPost]
    [ProducesResponseType(
        typeof(PerformerDto),
        StatusCodes.Status201Created)]
    public async Task<ActionResult<PerformerDto>> Create(
        CreatePerformerDto dto)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Name is required." });

        var performer = new Performer
        {
            Name = dto.Name.Trim(),
            BirthYear = dto.BirthYear,
            Residence = dto.Residence,
            PhotoUrl = dto.PhotoUrl,
            OwnerId = userId.Value,
            PublicationStatus = PublicationStatus.Draft
        };

        _context.Performers.Add(performer);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetById),
            new { id = performer.Id },
            ToDto(performer));
    }

    // PUT /api/performers/{id}
    [Authorize]
    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        int id,
        UpdatePerformerDto dto)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Name is required." });

        dto.Name = dto.Name.Trim();

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var performer = await _context.Performers
            .FromSqlInterpolated($"""
                SELECT * FROM "Performers"
                WHERE "Id" = {id}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync();

        if (performer is null)
            return NotFound();

        if (!CanManage(performer))
            return Forbid();

        if (performer.PublicationStatus == PublicationStatus.Pending)
        {
            return Conflict(new
            {
                message = "Performer is awaiting moderation."
            });
        }

        if (performer.PublicationStatus == PublicationStatus.Draft)
        {
            performer.Name = dto.Name;
            performer.BirthYear = dto.BirthYear;
            performer.Residence = dto.Residence;
            performer.PhotoUrl = dto.PhotoUrl;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return NoContent();
        }

        if (performer.PublicationStatus != PublicationStatus.Published)
        {
            return Conflict(new
            {
                message = "Unknown publication status."
            });
        }

        var hasPending = await _context.ModerationRequests
            .AnyAsync(r =>
                r.EntityType == ModerationEntityTypes.Performer &&
                r.EntityId == id &&
                r.Status == ModerationStatuses.Pending);

        if (hasPending)
        {
            return Conflict(new
            {
                message = "A moderation request already exists."
            });
        }

        var request = new ModerationRequest
        {
            EntityType = ModerationEntityTypes.Performer,
            EntityId = performer.Id,
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
            message = "Proposed changes are awaiting moderation."
        });
    }

    // POST /api/performers/{id}/submit
    [Authorize]
    [HttpPost("{id:int}/submit")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Submit(int id)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var performer = await _context.Performers
            .FromSqlInterpolated($"""
                SELECT * FROM "Performers"
                WHERE "Id" = {id}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync();

        if (performer is null)
            return NotFound();

        if (!CanManage(performer))
            return Forbid();

        if (performer.PublicationStatus != PublicationStatus.Draft)
        {
            return Conflict(new
            {
                message = "Only drafts can be submitted."
            });
        }

        var hasPending = await _context.ModerationRequests
            .AnyAsync(r =>
                r.EntityType == ModerationEntityTypes.Performer &&
                r.EntityId == id &&
                r.Status == ModerationStatuses.Pending);

        if (hasPending)
        {
            return Conflict(new
            {
                message = "A moderation request already exists."
            });
        }

        performer.PublicationStatus = PublicationStatus.Pending;

        var request = new ModerationRequest
        {
            EntityType = ModerationEntityTypes.Performer,
            EntityId = performer.Id,
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
            message = "Performer submitted for publication."
        });
    }

    // DELETE /api/performers/{id}
    // Only a draft without dependencies/history can be deleted.
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

        var performer = await _context.Performers
            .FromSqlInterpolated($"""
                SELECT * FROM "Performers"
                WHERE "Id" = {id}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync();

        if (performer is null)
            return NotFound();

        if (!CanManage(performer))
            return Forbid();

        if (performer.PublicationStatus != PublicationStatus.Draft)
        {
            return Conflict(new
            {
                message = "Only unpublished drafts can be deleted."
            });
        }

        var hasSongs = await _context.Songs
            .AnyAsync(s => s.PerformerId == id);

        var hasHistory = await _context.ModerationRequests
            .AnyAsync(r =>
                r.EntityType == ModerationEntityTypes.Performer &&
                r.EntityId == id);

        if (hasSongs || hasHistory)
        {
            return Conflict(new
            {
                message = "Performer has related songs or moderation history."
            });
        }

        _context.Performers.Remove(performer);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return NoContent();
    }

    // GET /api/performers/{id}/profile
    [HttpGet("{id:int}/profile")]
    public async Task<ActionResult<PerformerProfileDto>> GetProfile(int id)
    {
        var performer = await _context.Performers
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (performer is null || !CanRead(performer))
            return NotFound();

        var query = VisibleSongsQuery(id);

        var songs = await query
            .OrderBy(s => s.Id)
            .Select(s => new PerformerProfileSongDto
            {
                Id = s.Id,
                Title = s.Title,
                RecordingYear = s.RecordingYear,
                IsPublic = s.IsPublic
            })
            .ToListAsync();

        foreach (var song in songs)
        {
            song.Links["self"] = new LinkDto
            {
                Href = $"/api/songs/{song.Id}"
            };

            song.Links["comments"] = new LinkDto
            {
                Href = $"/api/performers/{id}/songs/{song.Id}/comments"
            };
        }

        var profile = new PerformerProfileDto
        {
            Id = performer.Id,
            Name = performer.Name,
            BirthYear = performer.BirthYear,
            Residence = performer.Residence,
            PhotoUrl = performer.PhotoUrl,
            SongCount = songs.Count,
            Songs = songs
        };

        profile.Links["self"] = new LinkDto
        {
            Href = $"/api/performers/{id}/profile"
        };

        profile.Links["performer"] = new LinkDto
        {
            Href = $"/api/performers/{id}"
        };

        profile.Links["songs"] = new LinkDto
        {
            Href = $"/api/performers/{id}/songs"
        };

        return Ok(profile);
    }

    // GET /api/performers/{id}/songs
    [HttpGet("{id:int}/songs")]
    public async Task<ActionResult<PagedResponse<SongDto>>> GetSongs(
        int id,
        string? title = null,
        int page = 1,
        int pageSize = 10)
    {
        if (!ValidPagination(page, pageSize))
            return BadRequest(new { message = "Invalid pagination." });

        var performer = await _context.Performers
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (performer is null || !CanRead(performer))
            return NotFound();

        var query = VisibleSongsQuery(id);

        if (!string.IsNullOrWhiteSpace(title))
        {
            query = query.Where(s =>
                s.Title.ToLower().Contains(title.ToLower()));
        }

        var total = await query.CountAsync();

        var songs = await query
            .OrderBy(s => s.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new SongDto
            {
                Id = s.Id,
                Title = s.Title,
                Lyrics = s.Lyrics,
                RecordingYear = s.RecordingYear,
                RecordingPlace = s.RecordingPlace,
                ExternalArchiveUrl = s.ExternalArchiveUrl,
                AudioUrl = s.AudioUrl,
                IsPublic = s.IsPublic,
                PublicationStatus = s.PublicationStatus,
                PerformerId = s.PerformerId,
                PerformerName = s.Performer.Name
            })
            .ToListAsync();

        foreach (var song in songs)
            AddSongLinks(song);

        return Ok(new PagedResponse<SongDto>
        {
            Items = songs,
            Page = page,
            PageSize = pageSize,
            TotalItems = total,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    // GET /api/performers/{performerId}/songs/{songId}/comments
    [HttpGet("{performerId:int}/songs/{songId:int}/comments")]
    public async Task<ActionResult<IEnumerable<CommentDto>>> GetSongComments(
        int performerId,
        int songId)
    {
        var performer = await _context.Performers
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == performerId);

        if (performer is null || !CanRead(performer))
            return NotFound();

        var song = await _context.Songs
            .AsNoTracking()
            .FirstOrDefaultAsync(s =>
                s.Id == songId &&
                s.PerformerId == performerId);

        if (song is null || !CanReadSong(song))
            return NotFound();

        var comments = await _context.Comments
            .AsNoTracking()
            .Where(c => c.SongId == songId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new CommentDto
            {
                Id = c.Id,
                Text = c.Text,
                AuthorName = c.AuthorName,
                CreatedAt = c.CreatedAt,
                SongId = c.SongId
            })
            .ToListAsync();

        foreach (var comment in comments)
            AddCommentLinks(comment);

        return Ok(comments);
    }

    private IQueryable<Song> VisibleSongsQuery(int performerId)
    {
        var query = _context.Songs
            .AsNoTracking()
            .Where(s => s.PerformerId == performerId);

        if (IsModeratorOrAdmin())
            return query;

        var userId = CurrentUserId();

        return query.Where(s =>
            (s.PublicationStatus == PublicationStatus.Published &&
             s.IsPublic) ||
            (userId.HasValue && s.OwnerId == userId.Value));
    }

    private static bool ValidPagination(int page, int pageSize)
    {
        return page >= 1 &&
               pageSize is >= 1 and <= 100 &&
               (long)(page - 1) * pageSize <= int.MaxValue;
    }
}
