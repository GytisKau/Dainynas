using System.ComponentModel.DataAnnotations;

namespace Dainynas.Api.DTOs.Auth;

public class RefreshTokenDto
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}