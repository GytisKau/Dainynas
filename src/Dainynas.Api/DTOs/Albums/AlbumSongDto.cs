namespace Dainynas.Api.DTOs.Albums;

public class AlbumSongDto
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;
    public int Position { get; set; }
}