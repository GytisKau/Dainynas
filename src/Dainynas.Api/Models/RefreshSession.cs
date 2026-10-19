namespace Dainynas.Api.Models;

public class RefreshSession
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public required string TokenHash { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? RevokedAt { get; set; }
}