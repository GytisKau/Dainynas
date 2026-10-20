using System.Text.Json;

namespace Dainynas.Api.DTOs.Moderation;

public class ModerationRequestDto
{
    public int Id { get; set; }

    public string EntityType { get; set; } = string.Empty;
    public int EntityId { get; set; }

    public string RequestType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;

    public JsonElement? ProposedData { get; set; }

    public int? SubmittedByUserId { get; set; }
    public DateTime SubmittedAt { get; set; }

    public int? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public string? RejectionReason { get; set; }
}