using Dainynas.Api.Data;
using Dainynas.Api.DTOs.Comments;
using Dainynas.Api.DTOs.Common;
using Dainynas.Api.DTOs.Performers;
using Dainynas.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dainynas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PerformersController(DainynasDbContext context) : ControllerBase
{
    private readonly DainynasDbContext _context = context;

    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<PerformerDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<PerformerDto>>> GetAll(
        string? name = null,
        int page = 1, int pageSize = 10)
    {
        if (page < 1)
            return BadRequest(new { message = "Page must be greater than 0." });

        if (pageSize < 1 || pageSize > 100)
            return BadRequest(new { message = "PageSize must be between 1 and 100." });

        var query = _context.Performers.AsQueryable();

        if (!string.IsNullOrWhiteSpace(name))
            query = query.Where(performer => performer.Name.ToLower().Contains(name.ToLower()));

        var totalItems = await query.CountAsync();

        var performers = await query
            .OrderBy(performer => performer.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(performer => new PerformerDto
            {
                Id = performer.Id,
                Name = performer.Name,
                BirthYear = performer.BirthYear,
                Residence = performer.Residence,
                PhotoUrl = performer.PhotoUrl
            })
            .ToListAsync();

        return Ok(new PagedResponse<PerformerDto>
        {
            Items = performers,
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = (int)Math.Ceiling(
                totalItems / (double)pageSize
            )
        });
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PerformerDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PerformerDto>> GetById(int id)
    {
        var performer = await _context.Performers
            .Where(p => p.Id == id)
            .Select(p => new PerformerDto
            {
                Id = p.Id,
                Name = p.Name,
                BirthYear = p.BirthYear,
                Residence = p.Residence,
                PhotoUrl = p.PhotoUrl
            })
            .FirstOrDefaultAsync();

        if (performer is null)
        {
            return NotFound();
        }

        return Ok(performer);
    }

    [HttpPost]
    [ProducesResponseType(typeof(PerformerDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PerformerDto>> Create(
        CreatePerformerDto dto)
    {
        var performer = new Performer
        {
            Name = dto.Name,
            BirthYear = dto.BirthYear,
            Residence = dto.Residence,
            PhotoUrl = dto.PhotoUrl
        };

        _context.Performers.Add(performer);
        await _context.SaveChangesAsync();

        var result = new PerformerDto
        {
            Id = performer.Id,
            Name = performer.Name,
            BirthYear = performer.BirthYear,
            Residence = performer.Residence,
            PhotoUrl = performer.PhotoUrl
        };

        return CreatedAtAction(
            nameof(GetById),
            new { id = performer.Id },
            result);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        int id,
        UpdatePerformerDto dto)
    {
        var performer = await _context.Performers.FindAsync(id);

        if (performer is null)
        {
            return NotFound();
        }

        performer.Name = dto.Name;
        performer.BirthYear = dto.BirthYear;
        performer.Residence = dto.Residence;
        performer.PhotoUrl = dto.PhotoUrl;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var performer = await _context.Performers.FindAsync(id);

        if (performer is null)
        {
            return NotFound();
        }

        _context.Performers.Remove(performer);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{performerId:int}/songs/{songId:int}/comments")]
    [ProducesResponseType(typeof(IEnumerable<CommentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IEnumerable<CommentDto>>> GetSongComments(
        int performerId,
        int songId)
    {
        var performerExists = await _context.Performers
            .AnyAsync(performer => performer.Id == performerId);

        if (!performerExists)
        {
            return NotFound(new
            {
                message = $"Performer with id {performerId} does not exist."
            });
        }

        var songExists = await _context.Songs
            .AnyAsync(song =>
                song.Id == songId &&
                song.PerformerId == performerId);

        if (!songExists)
        {
            return NotFound(new
            {
                message =
                    $"Song with id {songId} does not belong to performer {performerId}."
            });
        }

        var comments = await _context.Comments
            .Where(comment => comment.SongId == songId)
            .OrderByDescending(comment => comment.CreatedAt)
            .Select(comment => new CommentDto
            {
                Id = comment.Id,
                Text = comment.Text,
                AuthorName = comment.AuthorName,
                CreatedAt = comment.CreatedAt,
                SongId = comment.SongId
            })
            .ToListAsync();

        return Ok(comments);
    }
}