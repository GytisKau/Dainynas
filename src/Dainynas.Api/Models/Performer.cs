namespace Dainynas.Api.Models;

public class Performer
{
    public int Id { get; set; }
    
    public required string Name { get; set; }
    public int? BirthYear { get; set; }
    public string? Residence { get; set; }
    public string? PhotoUrl { get; set; }

    public ICollection<Song> Songs { get; set; } = new List<Song>();
}