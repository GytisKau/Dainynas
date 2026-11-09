namespace Dainynas.Api.DTOs.Admin;

public class AdminUserDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsBlocked { get; set; }
    public int ActiveSessions { get; set; }
}
