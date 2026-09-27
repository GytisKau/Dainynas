using System.ComponentModel.DataAnnotations;

namespace Dainynas.Api.DTOs.Songs;

public class CreateSongDto
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Lyrics { get; set; }

    [Range(1800, 2100)]
    public int? RecordingYear { get; set; }

    [MaxLength(200)]
    public string? RecordingPlace { get; set; }

    [Url]
    public string? ExternalArchiveUrl { get; set; }

    [Url]
    public string? AudioUrl { get; set; }

    public bool IsPublic { get; set; }

    [Range(1, int.MaxValue)]
    public int PerformerId { get; set; }
}