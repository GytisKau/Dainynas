namespace Dainynas.Api.Models;

public class Comment
{
    public int Id { get; set; }

    public required string Text { get; set; }
    public string? AuthorName { get; set; }
    public DateTime CreatedAt { get; set; }

    public int SongId { get; set; }
    public Song Song { get; set; } = null!;
}