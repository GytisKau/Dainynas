using Dainynas.Api.DTOs.Common;

namespace Dainynas.Api.DTOs.Albums;

public class AlbumSongDto
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;
    public int Position { get; set; }

    public string PerformerName { get; set; } = string.Empty;
    
    public string? RecordingPlace { get; set; } 

    public Dictionary<string, LinkDto> Links { get; set; } = [];
}