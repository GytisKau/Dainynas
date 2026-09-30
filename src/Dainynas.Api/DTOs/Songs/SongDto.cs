using Dainynas.Api.DTOs.Common;

namespace Dainynas.Api.DTOs.Songs;

public class SongDto
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Lyrics { get; set; }
    public int? RecordingYear { get; set; }
    public string? RecordingPlace { get; set; }
    public string? ExternalArchiveUrl { get; set; }
    public string? AudioUrl { get; set; }
    public bool IsPublic { get; set; }

    public int PerformerId { get; set; }
    public string PerformerName { get; set; } = string.Empty;

    public Dictionary<string, LinkDto> Links { get; set; } = [];
}