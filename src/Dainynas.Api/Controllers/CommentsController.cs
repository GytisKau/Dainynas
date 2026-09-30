using Dainynas.Api.Data;
using Dainynas.Api.DTOs.Comments;
using Dainynas.Api.DTOs.Common;
using Dainynas.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dainynas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommentsController(DainynasDbContext context) : ControllerBase
{
    private readonly DainynasDbContext _context = context;

    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<CommentDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<CommentDto>>> GetAll(
        string? text = null, string? authorName = null,
        int page = 1, int pageSize = 10)
    {
        if (page < 1)
            return BadRequest(new { message = "Page must be greater than 0." });

        if (pageSize < 1 || pageSize > 100)
            return BadRequest(new { message = "PageSize must be between 1 and 100." });

        var query = _context.Comments.AsQueryable();

        if (!string.IsNullOrWhiteSpace(text))
            query = query.Where(comment => comment.Text.ToLower().Contains(text.ToLower()));

        if (!string.IsNullOrWhiteSpace(authorName))
            query = query.Where(comment =>
                comment.AuthorName != null &&
                comment.AuthorName.ToLower().Contains(authorName.ToLower()));

        var totalItems = await query.CountAsync();

        var comments = await query
            .OrderByDescending(comment => comment.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(comment => new CommentDto
            {
                Id = comment.Id,
                Text = comment.Text,
                AuthorName = comment.AuthorName,
                CreatedAt = comment.CreatedAt,
                SongId = comment.SongId
            })
            .ToListAsync();

        var response = new PagedResponse<CommentDto>
        {
            Items = comments,
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = (int)Math.Ceiling(
                totalItems / (double)pageSize
            )
        };

        return Ok(response);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(CommentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CommentDto>> GetById(int id)
    {
        var comment = await _context.Comments
            .Where(comment => comment.Id == id)
            .Select(comment => new CommentDto
            {
                Id = comment.Id,
                Text = comment.Text,
                AuthorName = comment.AuthorName,
                CreatedAt = comment.CreatedAt,
                SongId = comment.SongId
            })
            .FirstOrDefaultAsync();

        if (comment is null)
        {
            return NotFound();
        }

        return Ok(comment);
    }

    [HttpPost]
    [ProducesResponseType(typeof(CommentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CommentDto>> Create(CreateCommentDto dto)
    {
        var songExists = await _context.Songs
            .AnyAsync(song => song.Id == dto.SongId);

        if (!songExists)
        {
            return BadRequest(new
            {
                message = $"Song with id {dto.SongId} does not exist."
            });
        }

        var comment = new Comment
        {
            Text = dto.Text,
            AuthorName = dto.AuthorName,
            CreatedAt = DateTime.UtcNow,
            SongId = dto.SongId
        };

        _context.Comments.Add(comment);
        await _context.SaveChangesAsync();

        var response = new CommentDto
        {
            Id = comment.Id,
            Text = comment.Text,
            AuthorName = comment.AuthorName,
            CreatedAt = comment.CreatedAt,
            SongId = comment.SongId
        };

        return CreatedAtAction(
            nameof(GetById),
            new { id = comment.Id },
            response
        );
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        int id,
        UpdateCommentDto dto)
    {
        var comment = await _context.Comments.FindAsync(id);

        if (comment is null)
        {
            return NotFound();
        }

        var songExists = await _context.Songs
            .AnyAsync(song => song.Id == dto.SongId);

        if (!songExists)
        {
            return BadRequest(new
            {
                message = $"Song with id {dto.SongId} does not exist."
            });
        }

        comment.Text = dto.Text;
        comment.AuthorName = dto.AuthorName;
        comment.SongId = dto.SongId;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var comment = await _context.Comments.FindAsync(id);

        if (comment is null)
        {
            return NotFound();
        }

        _context.Comments.Remove(comment);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}