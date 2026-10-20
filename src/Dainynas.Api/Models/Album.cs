namespace Dainynas.Api.Models;

public class Album
{
    public int Id { get; set; }
    
    public required string Title { get; set; }
    public string? Description { get; set; }
    public bool IsPublic { get; set; }
    
    public ICollection<AlbumSong> AlbumSongs { get; set; } = [];

    public int? OwnerId { get; set; }
    public User? Owner { get; set; }

    public string PublicationStatus { get; set; } = Models.PublicationStatus.Draft;
}