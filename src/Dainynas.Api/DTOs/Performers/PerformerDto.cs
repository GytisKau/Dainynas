namespace Dainynas.Api.DTOs.Performers;

public class PerformerDto
{
    public int Id { get; set; }
    
    public string Name { get; set; } = string.Empty;
    public int? BirthYear { get; set; }
    public string? Residence { get; set; }
    public string? PhotoUrl { get; set; }
}