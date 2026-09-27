using Dainynas.Api.Data;
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
    [ProducesResponseType(typeof(IEnumerable<PerformerDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<PerformerDto>>> GetAll()
    {
        var performers = await _context.Performers
            .Select(p => new PerformerDto
            {
                Id = p.Id,
                Name = p.Name,
                BirthYear = p.BirthYear,
                Residence = p.Residence,
                PhotoUrl = p.PhotoUrl
            })
            .ToListAsync();

        return Ok(performers);
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
}