using Dainynas.Api.Data;
using Dainynas.Api.DTOs.Songs;
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
    [ProducesResponseType(typeof(IEnumerable<SongDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<SongDto>>> GetAll(
        [FromQuery] string? title,
        [FromQuery] int? year,
        [FromQuery] int? performerId)
    {
        var query = _context.Songs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(title))
        {
            query = query.Where(s =>
                s.Title.ToLower().Contains(title.ToLower()));
        }

        if (year.HasValue)
        {
            query = query.Where(s => s.RecordingYear == year.Value);
        }

        if (performerId.HasValue)
        {
            query = query.Where(s => s.PerformerId == performerId.Value);
        }

        var songs = await query
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
            .ToListAsync();

        return Ok(songs);
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
}