using Dainynas.Api.Data;
using Dainynas.Api.DTOs.Albums;
using Dainynas.Api.DTOs.Common;
using Dainynas.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dainynas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AlbumsController(DainynasDbContext context) : ControllerBase
{
    private readonly DainynasDbContext _context = context;

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<AlbumDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<AlbumDto>>> GetAll(
        [FromQuery] string? title)
    {
        var query = _context.Albums.AsQueryable();

        if (!string.IsNullOrWhiteSpace(title))
        {
            query = query.Where(a =>
                a.Title.ToLower().Contains(title.ToLower()));
        }

        var albums = await query
            .Select(a => new AlbumDto
            {
                Id = a.Id,
                Title = a.Title,
                Description = a.Description,
                IsPublic = a.IsPublic,

                Songs = a.AlbumSongs
                    .OrderBy(albumSong => albumSong.Position)
                    .Select(albumSong => new AlbumSongDto
                    {
                        Id = albumSong.Song.Id,
                        Title = albumSong.Song.Title,
                        Position = albumSong.Position
                    })
                    .ToList()
            })
            .ToListAsync();

        foreach (var album in albums)
            AddHypermedia(album);

        return Ok(albums);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(AlbumDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AlbumDto>> GetById(int id)
    {
        var album = await _context.Albums
            .Where(a => a.Id == id)
            .Select(a => new AlbumDto
            {
                Id = a.Id,
                Title = a.Title,
                Description = a.Description,
                IsPublic = a.IsPublic,

                Songs = a.AlbumSongs
                    .OrderBy(albumSong => albumSong.Position)
                    .Select(albumSong => new AlbumSongDto
                    {
                        Id = albumSong.Song.Id,
                        Title = albumSong.Song.Title,
                        Position = albumSong.Position
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (album is null)
        {
            return NotFound();
        }

        AddHypermedia(album);

        return Ok(album);
    }

    [HttpPost]
    [ProducesResponseType(typeof(AlbumDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AlbumDto>> Create(CreateAlbumDto dto)
    {
        var duplicateSongIds = dto.SongIds
            .GroupBy(id => id)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToList();

        if (duplicateSongIds.Count > 0)
        {
            return BadRequest(new
            {
                message = "The same song cannot appear more than once in an album.",
                duplicateSongIds
            });
        }

        var existingSongIds = await _context.Songs
            .Where(song => dto.SongIds.Contains(song.Id))
            .Select(song => song.Id)
            .ToListAsync();

        var missingSongIds = dto.SongIds
            .Except(existingSongIds)
            .ToList();

        if (missingSongIds.Count > 0)
        {
            return BadRequest(new
            {
                message = "One or more songs do not exist.",
                missingSongIds
            });
        }

        var album = new Album
        {
            Title = dto.Title,
            Description = dto.Description,
            IsPublic = dto.IsPublic
        };

        for (var i = 0; i < dto.SongIds.Count; i++)
        {
            album.AlbumSongs.Add(new AlbumSong
            {
                SongId = dto.SongIds[i],
                Position = i + 1
            });
        }

        _context.Albums.Add(album);

        await _context.SaveChangesAsync();

        var result = await _context.Albums
            .Where(a => a.Id == album.Id)
            .Select(a => new AlbumDto
            {
                Id = a.Id,
                Title = a.Title,
                Description = a.Description,
                IsPublic = a.IsPublic,

                Songs = a.AlbumSongs
                    .OrderBy(albumSong => albumSong.Position)
                    .Select(albumSong => new AlbumSongDto
                    {
                        Id = albumSong.Song.Id,
                        Title = albumSong.Song.Title,
                        Position = albumSong.Position
                    })
                    .ToList()
            })
            .SingleAsync();

        AddHypermedia(result);

        return CreatedAtAction(
            nameof(GetById),
            new { id = album.Id },
            result);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        int id,
        UpdateAlbumDto dto)
    {
        var album = await _context.Albums
            .Include(a => a.AlbumSongs)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (album is null)
        {
            return NotFound();
        }

        var duplicateSongIds = dto.SongIds
            .GroupBy(songId => songId)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToList();

        if (duplicateSongIds.Count > 0)
        {
            return BadRequest(new
            {
                message = "The same song cannot appear more than once in an album.",
                duplicateSongIds
            });
        }

        var existingSongIds = await _context.Songs
            .Where(song => dto.SongIds.Contains(song.Id))
            .Select(song => song.Id)
            .ToListAsync();

        var missingSongIds = dto.SongIds
            .Except(existingSongIds)
            .ToList();

        if (missingSongIds.Count > 0)
        {
            return BadRequest(new
            {
                message = "One or more songs do not exist.",
                missingSongIds
            });
        }

        album.Title = dto.Title;
        album.Description = dto.Description;
        album.IsPublic = dto.IsPublic;

        _context.AlbumSongs.RemoveRange(album.AlbumSongs);

        album.AlbumSongs.Clear();

        for (var i = 0; i < dto.SongIds.Count; i++)
        {
            album.AlbumSongs.Add(new AlbumSong
            {
                AlbumId = album.Id,
                SongId = dto.SongIds[i],
                Position = i + 1
            });
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var album = await _context.Albums
            .Include(a => a.AlbumSongs)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (album is null)
        {
            return NotFound();
        }

        _context.Albums.Remove(album);

        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static void AddLinks(AlbumDto album)
    {
        album.Links = new Dictionary<string, LinkDto>
        {
            ["self"] = new()
            {
                Href = $"/api/albums/{album.Id}",
                Method = "GET"
            },

            ["update"] = new()
            {
                Href = $"/api/albums/{album.Id}",
                Method = "PUT"
            },

            ["delete"] = new()
            {
                Href = $"/api/albums/{album.Id}",
                Method = "DELETE"
            }
        };
    }

    private static void AddSongLinks(AlbumDto album)
    {
        foreach (var song in album.Songs)
        {
            song.Links = new Dictionary<string, LinkDto>
            {
                ["song"] = new()
                {
                    Href = $"/api/songs/{song.Id}",
                    Method = "GET"
                }
            };
        }
    }

    private static void AddHypermedia(AlbumDto album)
    {
        AddLinks(album);
        AddSongLinks(album);
    }
}