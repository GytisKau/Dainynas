namespace Dainynas.Api.Models;

public class AlbumSong
{
    public int AlbumId { get; set; }
    public Album Album { get; set; } = null!;
    
    public int SongId { get; set; }
    public Song Song { get; set; } = null!;

    public int Position { get; set; }
}