
namespace Dainynas.Api.Models;

public class ModerationRequest
{
    public int Id { get; set; }

    // Performer, Song arba Album
    public required string EntityType { get; set; }
    public int EntityId { get; set; }

    // Publish arba Update
    public required string RequestType { get; set; }

    // Pending, Approved arba Rejected
    public string Status { get; set; } = "Pending";

    // Siūlomi duomenys JSON formatu.
    // Publish atveju gali būti null – tvirtinama
    // esama juodraščio versija.
    public string? ProposedDataJson { get; set; }

    public int? SubmittedByUserId { get; set; }
    public User? SubmittedByUser { get; set; } = null!;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public int? ReviewedByUserId { get; set; }
    public User? ReviewedByUser { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public string? RejectionReason { get; set; }
}
