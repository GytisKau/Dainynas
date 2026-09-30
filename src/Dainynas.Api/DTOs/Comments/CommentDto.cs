namespace Dainynas.Api.DTOs.Comments;

public class CommentDto
{
    public int Id { get; set; }

    public string Text { get; set; } = string.Empty;
    public string? AuthorName { get; set; }
    public DateTime CreatedAt { get; set; }

    public int SongId { get; set; }
}