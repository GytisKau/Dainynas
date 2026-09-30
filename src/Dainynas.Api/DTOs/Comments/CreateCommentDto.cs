using System.ComponentModel.DataAnnotations;

namespace Dainynas.Api.DTOs.Comments;

public class CreateCommentDto
{
    [Required]
    [MaxLength(2000)]
    public string Text { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? AuthorName { get; set; }

    [Range(1, int.MaxValue)]
    public int SongId { get; set; }
}