using Dainynas.Api.DTOs.Common;

namespace Dainynas.Api.DTOs.Performers;

public class PerformerProfileDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int? BirthYear { get; set; }

    public string? Residence { get; set; }

    public string? PhotoUrl { get; set; }

    public int SongCount { get; set; }

    public List<PerformerProfileSongDto> Songs { get; set; } = [];

    public Dictionary<string, LinkDto> Links { get; set; } = [];
}