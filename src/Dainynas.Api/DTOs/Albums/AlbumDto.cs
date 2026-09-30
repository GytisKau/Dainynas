using Dainynas.Api.DTOs.Common;

namespace Dainynas.Api.DTOs.Albums;

public class AlbumDto
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsPublic { get; set; }

    public List<AlbumSongDto> Songs { get; set; } = [];

    public Dictionary<string, LinkDto> Links { get; set; } = [];
}