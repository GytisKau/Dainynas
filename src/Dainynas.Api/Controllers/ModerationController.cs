
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.Json;
using Dainynas.Api.Data;
using Dainynas.Api.DTOs.Albums;
using Dainynas.Api.DTOs.Moderation;
using Dainynas.Api.DTOs.Performers;
using Dainynas.Api.DTOs.Songs;
using Dainynas.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dainynas.Api.Controllers;

[ApiController]
[Route("api/moderation")]
[Authorize(Roles = UserRoles.Moderator + "," + UserRoles.Admin)]
public class ModerationController(DainynasDbContext context) : ControllerBase
{
    private readonly DainynasDbContext _context = context;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private int? CurrentUserId()
    {
        return int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out var id)
                ? id
                : null;
    }

    private static ModerationRequestDto ToDto(ModerationRequest request)
    {
        return new ModerationRequestDto
        {
            Id = request.Id,
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            RequestType = request.RequestType,
            Status = request.Status,
            ProposedData = request.ProposedDataJson is null
                ? null
                : JsonSerializer.Deserialize<JsonElement>(request.ProposedDataJson),
            SubmittedByUserId = request.SubmittedByUserId,
            SubmittedAt = request.SubmittedAt,
            ReviewedByUserId = request.ReviewedByUserId,
            ReviewedAt = request.ReviewedAt,
            RejectionReason = request.RejectionReason
        };
    }

    private static T? ReadProposal<T>(ModerationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ProposedDataJson))
        {
            return default;
        }

        return JsonSerializer.Deserialize<T>(request.ProposedDataJson, JsonOptions);
    }

    private static bool IsValid<T>(T dto) where T : class
    {
        var context = new ValidationContext(dto);

        return Validator.TryValidateObject(dto, context, [], validateAllProperties: true);
    }


    [HttpGet("requests")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetRequests(
        string? status = null,
        string? entityType = null,
        int page = 1,
        int pageSize = 10)
    {
        if (page < 1 || pageSize < 1 || pageSize > 100)
        {
            return BadRequest(new
            {
                message = "Invalid pagination parameters."
            });
        }

        var query = _context.ModerationRequests.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(r => r.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            query = query.Where(r => r.EntityType == entityType);
        }

        var totalItems = await query.CountAsync();

        var requests = await query
            .OrderByDescending(r => r.SubmittedAt)
            .ThenByDescending(r => r.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            items = requests.Select(ToDto).ToList(),
            page,
            pageSize,
            totalItems,
            totalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
        });
    }


    [HttpGet("requests/{id:int}")]
    [ProducesResponseType(
        typeof(ModerationRequestDto),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRequest(int id)
    {
        var request = await _context.ModerationRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request is null)
        {
            return NotFound();
        }

        return Ok(ToDto(request));
    }


    [HttpPost("requests/{id:int}/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reject(int id, RejectModerationDto dto)
    {
        var userId = CurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var request = await _context.ModerationRequests
            .FromSqlInterpolated($"""
                SELECT * FROM "ModerationRequests"
                WHERE "Id" = {id}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync();

        if (request is null)
        {
            return NotFound();
        }

        if (request.Status != ModerationStatuses.Pending)
        {
            return Conflict(new
            {
                message = "Request has already been reviewed."
            });
        }

        if (request.RequestType == ModerationRequestTypes.Publish)
        {
            switch (request.EntityType)
            {
                case ModerationEntityTypes.Performer:
                {
                    var performer = await _context.Performers.FindAsync(request.EntityId);

                    if (performer is null)
                        return NotFound();

                    performer.PublicationStatus = PublicationStatus.Draft;
                    break;
                }

                case ModerationEntityTypes.Song:
                {
                    var song = await _context.Songs.FindAsync(request.EntityId);

                    if (song is null)
                        return NotFound();

                    song.PublicationStatus = PublicationStatus.Draft;
                    break;
                }

                case ModerationEntityTypes.Album:
                {
                    var album = await _context.Albums.FindAsync(request.EntityId);

                    if (album is null)
                        return NotFound();

                    album.PublicationStatus = PublicationStatus.Draft;
                    break;
                }

                default:
                    return BadRequest(new
                    {
                        message = "Unsupported entity type."
                    });
            }
        }
        else if (request.RequestType != ModerationRequestTypes.Update)
        {
            return BadRequest(new
            {
                message = "Unsupported request type."
            });
        }

        request.Status = ModerationStatuses.Rejected;
        request.RejectionReason = dto.Reason.Trim();
        request.ReviewedByUserId = userId.Value;
        request.ReviewedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return NoContent();
    }

    private async Task<string?> ApplyPerformerUpdate(ModerationRequest request)
    {
        var dto = ReadProposal<UpdatePerformerDto>(request);

        if (dto is null || !IsValid(dto))
            return "Invalid performer proposal.";

        var performer = await _context.Performers.FindAsync(request.EntityId);

        if (performer is null)
            return "Performer no longer exists.";

        if (performer.PublicationStatus != PublicationStatus.Published)
        {
            return "Performer is not published.";
        }

        performer.Name = dto.Name;
        performer.BirthYear = dto.BirthYear;
        performer.Residence = dto.Residence;
        performer.PhotoUrl = dto.PhotoUrl;

        return null;
    }

    private async Task<string?> ApplySongUpdate(ModerationRequest request)
    {
        var dto = ReadProposal<UpdateSongDto>(request);

        if (dto is null || !IsValid(dto))
            return "Invalid song proposal.";

        var song = await _context.Songs.FindAsync(request.EntityId);

        if (song is null)
            return "Song no longer exists.";

        if (song.PublicationStatus != PublicationStatus.Published)
        {
            return "Song is not published.";
        }

        var performer = await _context.Performers.FindAsync(dto.PerformerId);

        if (performer is null)
            return "Referenced performer does not exist.";

        if (dto.IsPublic &&
            performer.PublicationStatus != PublicationStatus.Published)
        {
            return "Cannot publish a song with an unpublished performer.";
        }

        song.Title = dto.Title;
        song.Lyrics = dto.Lyrics;
        song.RecordingYear = dto.RecordingYear;
        song.RecordingPlace = dto.RecordingPlace;
        song.ExternalArchiveUrl = dto.ExternalArchiveUrl;
        song.AudioUrl = dto.AudioUrl;
        song.IsPublic = dto.IsPublic;
        song.PerformerId = dto.PerformerId;

        return null;
    }

    private async Task<string?> ApplyAlbumUpdate(ModerationRequest request)
    {
        var dto = ReadProposal<UpdateAlbumDto>(request);

        if (dto is null || !IsValid(dto))
            return "Invalid album proposal.";

        var album = await _context.Albums
            .Include(a => a.AlbumSongs)
            .FirstOrDefaultAsync(a => a.Id == request.EntityId);

        if (album is null)
            return "Album no longer exists.";

        if (album.PublicationStatus != PublicationStatus.Published)
        {
            return "Album is not published.";
        }

        var songIds = dto.SongIds ?? [];

        if (songIds.Count != songIds.Distinct().Count())
            return "Album contains duplicate song IDs.";

        var songs = await _context.Songs
            .Where(s => songIds.Contains(s.Id))
            .ToListAsync();

        if (songs.Count != songIds.Count)
            return "Some referenced songs do not exist.";

        if (dto.IsPublic &&
            songs.Any(s =>
                !s.IsPublic ||
                s.PublicationStatus != PublicationStatus.Published))
        {
            return "Public album contains unpublished or private songs.";
        }

        album.Title = dto.Title;
        album.Description = dto.Description;
        album.IsPublic = dto.IsPublic;

        _context.AlbumSongs.RemoveRange(album.AlbumSongs);

        album.AlbumSongs.Clear();

        for (var i = 0; i < songIds.Count; i++)
        {
            album.AlbumSongs.Add(new AlbumSong
            {
                AlbumId = album.Id,
                SongId = songIds[i],
                Position = i + 1
            });
        }

        return null;
    }


    [HttpPost("requests/{id:int}/approve")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Approve(int id)
    {
        var userId = CurrentUserId();

        if (userId is null)
            return Unauthorized();

        await using var transaction = await _context.Database.BeginTransactionAsync();

        // Lock the request to prevent concurrent decisions.
        var request = await _context.ModerationRequests
            .FromSqlInterpolated($"""
                SELECT * FROM "ModerationRequests"
                WHERE "Id" = {id}
                FOR UPDATE
                """)
            .SingleOrDefaultAsync();

        if (request is null)
            return NotFound();

        if (request.Status != ModerationStatuses.Pending)
        {
            return Conflict(new
            {
                message = "Request has already been reviewed."
            });
        }

        string? error = null;

        if (request.RequestType == ModerationRequestTypes.Publish)
        {
            switch (request.EntityType)
            {
                case ModerationEntityTypes.Performer:
                {
                    var performer = await _context.Performers.FindAsync(request.EntityId);

                    if (performer is null)
                        return NotFound();

                    if (performer.PublicationStatus != PublicationStatus.Pending)
                    {
                        return Conflict(new
                        {
                            message = "Performer is not pending."
                        });
                    }

                    performer.PublicationStatus = PublicationStatus.Published;

                    break;
                }

                case ModerationEntityTypes.Song:
                {
                    var song = await _context.Songs.FindAsync(request.EntityId);

                    if (song is null)
                        return NotFound();

                    if (song.PublicationStatus != PublicationStatus.Pending)
                    {
                        return Conflict(new
                        {
                            message = "Song is not pending."
                        });
                    }

                    var performer = await _context.Performers.FindAsync(song.PerformerId);

                    if (performer is null ||
                        (song.IsPublic &&
                        performer.PublicationStatus !=
                            PublicationStatus.Published))
                    {
                        error = "Song performer is not published.";
                        break;
                    }

                    song.PublicationStatus = PublicationStatus.Published;

                    break;
                }

                case ModerationEntityTypes.Album:
                {
                    var album = await _context.Albums
                        .Include(a => a.AlbumSongs)
                        .FirstOrDefaultAsync(a =>
                            a.Id == request.EntityId);

                    if (album is null)
                        return NotFound();

                    if (album.PublicationStatus != PublicationStatus.Pending)
                    {
                        return Conflict(new
                        {
                            message = "Album is not pending."
                        });
                    }

                    if (album.IsPublic)
                    {
                        var songIds = album.AlbumSongs
                            .Select(s => s.SongId)
                            .ToList();

                        var validSongs = await _context.Songs
                            .CountAsync(s =>
                                songIds.Contains(s.Id) &&
                                s.IsPublic &&
                                s.PublicationStatus ==
                                    PublicationStatus.Published);

                        if (validSongs != songIds.Count)
                        {
                            error = "Album contains unpublished songs.";
                            break;
                        }
                    }

                    album.PublicationStatus = PublicationStatus.Published;

                    break;
                }

                default:
                    error = "Unsupported entity type.";
                    break;
            }
        }
        else if (request.RequestType == ModerationRequestTypes.Update)
        {
            try
            {
                error = request.EntityType switch
                {
                    ModerationEntityTypes.Performer => await ApplyPerformerUpdate(request),
                    ModerationEntityTypes.Song => await ApplySongUpdate(request),
                    ModerationEntityTypes.Album => await ApplyAlbumUpdate(request),
                    _ => "Unsupported entity type."
                };
            }
            catch (JsonException)
            {
                error = "Invalid proposed JSON data.";
            }
        }
        else
        {
            error = "Unsupported request type.";
        }

        if (error is not null)
        {
            return Conflict(new
            {
                message = error
            });
        }

        request.Status = ModerationStatuses.Approved;
        request.ReviewedByUserId = userId.Value;
        request.ReviewedAt = DateTime.UtcNow;
        request.RejectionReason = null;

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return NoContent();
    }

}
