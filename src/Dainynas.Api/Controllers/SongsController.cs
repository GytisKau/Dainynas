using Dainynas.Api.Data;
using Dainynas.Api.DTOs.Songs;
using Dainynas.Api.DTOs.Common;
using Dainynas.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dainynas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SongsController(DainynasDbContext context) : ControllerBase
{
    private readonly DainynasDbContext _context = context;

    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<SongDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<SongDto>>> GetAll(
        string? title = null, int? year = null, int? performerId = null,
        int page = 1, int pageSize = 10)
    {
        if (page < 1)
            return BadRequest(new { message = "Page must be greater than 0." });

        if (pageSize < 1 || pageSize > 100)
            return BadRequest(new { message = "PageSize must be between 1 and 100." });

        var query = _context.Songs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(title))
            query = query.Where(song => song.Title.ToLower().Contains(title.ToLower()));

        if (year.HasValue)
            query = query.Where(song => song.RecordingYear == year.Value);

        if (performerId.HasValue)
            query = query.Where(song => song.PerformerId == performerId.Value);

        var totalItems = await query.CountAsync();

        var songs = await query
            .OrderBy(song => song.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(song => new SongDto
            {
                Id = song.Id,
                Title = song.Title,
                Lyrics = song.Lyrics,
                RecordingYear = song.RecordingYear,
                RecordingPlace = song.RecordingPlace,
                ExternalArchiveUrl = song.ExternalArchiveUrl,
                AudioUrl = song.AudioUrl,
                IsPublic = song.IsPublic,
                PerformerId = song.PerformerId,
                PerformerName = song.Performer.Name
            })
            .ToListAsync();


        foreach(var song in songs)
            AddLinks(song);

        return Ok(new PagedResponse<SongDto>
        {
            Items = songs,
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = (int)Math.Ceiling(
                totalItems / (double)pageSize
            )
        });
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(SongDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SongDto>> GetById(int id)
    {
        var song = await _context.Songs
            .Where(s => s.Id == id)
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
                PerformerId = s.PerformerId,
                PerformerName = s.Performer.Name
            })
            .FirstOrDefaultAsync();

        if (song is null)
        {
            return NotFound();
        }

        AddLinks(song);

        return Ok(song);
    }

    [HttpPost]
    [ProducesResponseType(typeof(SongDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SongDto>> Create(CreateSongDto dto)
    {
        var performer = await _context.Performers
            .FindAsync(dto.PerformerId);

        if (performer is null)
        {
            return BadRequest(new
            {
                message = $"Performer with id {dto.PerformerId} does not exist."
            });
        }

        var song = new Song
        {
            Title = dto.Title,
            Lyrics = dto.Lyrics,
            RecordingYear = dto.RecordingYear,
            RecordingPlace = dto.RecordingPlace,
            ExternalArchiveUrl = dto.ExternalArchiveUrl,
            AudioUrl = dto.AudioUrl,
            IsPublic = dto.IsPublic,
            PerformerId = dto.PerformerId
        };

        _context.Songs.Add(song);
        await _context.SaveChangesAsync();

        var result = new SongDto
        {
            Id = song.Id,
            Title = song.Title,
            Lyrics = song.Lyrics,
            RecordingYear = song.RecordingYear,
            RecordingPlace = song.RecordingPlace,
            ExternalArchiveUrl = song.ExternalArchiveUrl,
            AudioUrl = song.AudioUrl,
            IsPublic = song.IsPublic,
            PerformerId = song.PerformerId,
            PerformerName = performer.Name
        };

        AddLinks(result);

        return CreatedAtAction(
            nameof(GetById),
            new { id = song.Id },
            result);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        int id,
        UpdateSongDto dto)
    {
        var song = await _context.Songs.FindAsync(id);

        if (song is null)
        {
            return NotFound();
        }

        var performerExists = await _context.Performers
            .AnyAsync(p => p.Id == dto.PerformerId);

        if (!performerExists)
        {
            return BadRequest(new
            {
                message = $"Performer with id {dto.PerformerId} does not exist."
            });
        }

        song.Title = dto.Title;
        song.Lyrics = dto.Lyrics;
        song.RecordingYear = dto.RecordingYear;
        song.RecordingPlace = dto.RecordingPlace;
        song.ExternalArchiveUrl = dto.ExternalArchiveUrl;
        song.AudioUrl = dto.AudioUrl;
        song.IsPublic = dto.IsPublic;
        song.PerformerId = dto.PerformerId;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var song = await _context.Songs.FindAsync(id);

        if (song is null)
        {
            return NotFound();
        }

        _context.Songs.Remove(song);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static void AddLinks(SongDto song)
    {
        song.Links = new Dictionary<string, LinkDto>
        {
            ["self"] = new()
            {
                Href = $"/api/songs/{song.Id}",
                Method = "GET"
            },

            ["performer"] = new()
            {
                Href = $"/api/performers/{song.PerformerId}",
                Method = "GET"
            },

            ["comments"] = new()
            {
                Href =
                    $"/api/performers/{song.PerformerId}/songs/{song.Id}/comments",
                Method = "GET"
            },

            ["update"] = new()
            {
                Href = $"/api/songs/{song.Id}",
                Method = "PUT"
            },

            ["delete"] = new()
            {
                Href = $"/api/songs/{song.Id}",
                Method = "DELETE"
            }
        };
    }
}