namespace Dainynas.Api.Models;

public class Song
{
    public int Id { get; set; }

    public required string Title { get; set; }
    public string? Lyrics { get; set; }
    public int? RecordingYear { get; set; }
    public string? RecordingPlace { get; set; }
    public string? ExternalArchiveUrl { get; set; }
    public string? AudioUrl { get; set; }
    public bool IsPublic { get; set; }

    public int PerformerId { get; set; }
    public Performer Performer { get; set; } = null!;

    public ICollection<AlbumSong> AlbumSongs { get; set; } = [];
    
    public ICollection<Comment> Comments { get; set; } = [];
}