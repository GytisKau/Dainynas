
using System.Security.Claims;
using Dainynas.Api.Data;
using Dainynas.Api.DTOs.Comments;
using Dainynas.Api.DTOs.Common;
using Dainynas.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Dainynas.Api.Extensions;
using Dainynas.Api.Helpers;

namespace Dainynas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommentsController(DainynasDbContext context) : ControllerBase
{
    private readonly DainynasDbContext _context = context;

    // ---------------- Helpers ----------------

    private bool CanReadSong(Song song)
    {
        if (User.IsModeratorOrAdmin())
            return true;

        var userId = User.GetUserId();

        if (userId.HasValue &&
            song.OwnerId == userId.Value)
        {
            return true;
        }

        return song.PublicationStatus ==
                   PublicationStatus.Published &&
               song.IsPublic &&
               song.Performer.PublicationStatus ==
                   PublicationStatus.Published;
    }

    // Comments visible to the current caller.
    private IQueryable<Comment> VisibleCommentsQuery()
    {
        var query = _context.Comments.AsNoTracking();

        if (User.IsModeratorOrAdmin())
            return query;

        var userId = User.GetUserId();

        if (userId.HasValue)
        {
            var id = userId.Value;

            return query.Where(c =>
                (c.Song.PublicationStatus ==
                    PublicationStatus.Published &&
                 c.Song.IsPublic &&
                 c.Song.Performer.PublicationStatus ==
                    PublicationStatus.Published) ||
                c.Song.OwnerId == id);
        }

        return query.Where(c =>
            c.Song.PublicationStatus ==
                PublicationStatus.Published &&
            c.Song.IsPublic &&
            c.Song.Performer.PublicationStatus ==
                PublicationStatus.Published);
    }

    private CommentDto ToDto(Comment comment)
    {
        var dto = new CommentDto
        {
            Id = comment.Id,
            Text = comment.Text,
            AuthorName = comment.AuthorName,
            CreatedAt = comment.CreatedAt,
            SongId = comment.SongId
        };

        dto.Links["self"] = new LinkDto
        {
            Href = $"/api/comments/{comment.Id}"
        };

        dto.Links["song"] = new LinkDto
        {
            Href = $"/api/songs/{comment.SongId}"
        };

        if (User.CanManage(comment.UserId))
        {
            dto.Links["update"] = new LinkDto
            {
                Href = $"/api/comments/{comment.Id}",
                Method = "PUT"
            };

            dto.Links["delete"] = new LinkDto
            {
                Href = $"/api/comments/{comment.Id}",
                Method = "DELETE"
            };
        }

        return dto;
    }

    // ---------------- GET LIST ----------------

    [HttpGet]
    [ProducesResponseType(
        typeof(PagedResponse<CommentDto>),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<CommentDto>>> GetAll(
        string? text = null,
        string? authorName = null,
        int? songId = null,
        int page = 1,
        int pageSize = 10)
    {
        if (!PaginationHelper.IsValid(page, pageSize))
            return BadRequest(new { message = "Invalid pagination." });

        if (songId.HasValue && songId.Value < 1)
        {
            return BadRequest(new
            {
                message = "SongId must be positive."
            });
        }

        var query = VisibleCommentsQuery();

        if (!string.IsNullOrWhiteSpace(text))
            query = query.Where(c =>
                EF.Functions.ILike(c.Text, $"%{text.Trim()}%"));

        if (!string.IsNullOrWhiteSpace(authorName))
            query = query.Where(c =>
                c.AuthorName != null &&
                EF.Functions.ILike(c.AuthorName, $"%{authorName.Trim()}%"));
                
        if (songId.HasValue)
            query = query.Where(c =>
                c.SongId == songId.Value);

        var result = await PaginationHelper.PaginateAsync(
            query
                .OrderByDescending(c => c.CreatedAt)
                .ThenByDescending(c => c.Id),
            page,
            pageSize);

        return Ok(new PagedResponse<CommentDto>
        {
            Items = [.. result.Items.Select(ToDto)],
            Page = result.Page,
            PageSize = result.PageSize,
            TotalItems = result.TotalItems,
            TotalPages = result.TotalPages
        });
    }

    // ---------------- GET BY ID ----------------

    [HttpGet("{id:int}")]
    [ProducesResponseType(
        typeof(CommentDto),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CommentDto>> GetById(int id)
    {
        var comment = await VisibleCommentsQuery()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (comment is null)
            return NotFound();

        return Ok(ToDto(comment));
    }

    // ---------------- CREATE ----------------

    [Authorize]
    [HttpPost]
    [ProducesResponseType(
        typeof(CommentDto),
        StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CommentDto>> Create(
        CreateCommentDto dto)
    {
        var userId = User.GetUserId();

        if (userId is null)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Text))
        {
            return BadRequest(new
            {
                message = "Comment text is required."
            });
        }

        var song = await _context.Songs
            .AsNoTracking()
            .Include(s => s.Performer)
            .FirstOrDefaultAsync(s => s.Id == dto.SongId);

        // Same 404 for missing or inaccessible songs.
        if (song is null || !CanReadSong(song))
        {
            return NotFound(new
            {
                message = "Song not found or not accessible."
            });
        }

        var comment = new Comment
        {
            Text = dto.Text.Trim(),
            AuthorName = string.IsNullOrWhiteSpace(dto.AuthorName)
                ? null
                : dto.AuthorName.Trim(),
            SongId = song.Id,
            UserId = userId.Value,
            CreatedAt = DateTime.UtcNow
        };

        _context.Comments.Add(comment);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetById),
            new { id = comment.Id },
            ToDto(comment));
    }

    // ---------------- UPDATE ----------------

    [Authorize]
    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        int id,
        UpdateCommentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Text))
            return BadRequest(new{ message = "Comment text is required."});

        var comment = await _context.Comments.FindAsync(id);

        if (comment is null)
            return NotFound();

        if (!User.CanManage(comment.UserId))
            return Forbid();

        // Prevent moving a comment to another song.
        if (dto.SongId != comment.SongId)
        {
            return BadRequest(new
            {
                message = "A comment cannot be moved to another song."
            });
        }

        comment.Text = dto.Text.Trim();

        comment.AuthorName =
            string.IsNullOrWhiteSpace(dto.AuthorName)
                ? null
                : dto.AuthorName.Trim();

        // UserId, SongId and CreatedAt are unchanged.

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // ---------------- DELETE ----------------

    [Authorize]
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var comment = await _context.Comments.FindAsync(id);

        if (comment is null)
            return NotFound();

        if (!User.CanManage(comment.UserId))
            return Forbid();

        _context.Comments.Remove(comment);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}