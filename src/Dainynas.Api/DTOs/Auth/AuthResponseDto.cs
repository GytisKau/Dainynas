namespace Dainynas.Api.DTOs.Auth;

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;

    public string RefreshToken { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public DateTime RefreshExpiresAt { get; set; }

    public string Role { get; set; } = string.Empty;
}