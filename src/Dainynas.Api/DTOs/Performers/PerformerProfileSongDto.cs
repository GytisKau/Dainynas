using Dainynas.Api.DTOs.Common;

namespace Dainynas.Api.DTOs.Performers;

public class PerformerProfileSongDto
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public int? RecordingYear { get; set; }

    public bool IsPublic { get; set; }

    public Dictionary<string, LinkDto> Links { get; set; } = [];
}