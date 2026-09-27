using System.ComponentModel.DataAnnotations;

namespace Dainynas.Api.DTOs.Performers;

public class CreatePerformerDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Range(1800, 2100)]
    public int? BirthYear { get; set; }

    [MaxLength(200)]
    public string? Residence { get; set; }

    [Url]
    public string? PhotoUrl { get; set; }
}