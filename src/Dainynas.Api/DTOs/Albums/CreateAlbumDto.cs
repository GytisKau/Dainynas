using System.ComponentModel.DataAnnotations;

namespace Dainynas.Api.DTOs.Albums;

public class CreateAlbumDto
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    public bool IsPublic { get; set; }

    public List<int> SongIds { get; set; } = [];
}