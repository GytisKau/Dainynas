using System.ComponentModel.DataAnnotations;

namespace Dainynas.Api.DTOs.Moderation;

public class RejectModerationDto
{
    [Required]
    [MinLength(5)]
    [MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;
}