namespace Dainynas.Api.Models;

public class Album
{
    public int Id { get; set; }
    
    public required string Title { get; set; }
    public string? Description { get; set; }
    public bool IsPublic { get; set; }
    
    public ICollection<AlbumSong> AlbumSongs { get; set; } =
        new List<AlbumSong>();
}