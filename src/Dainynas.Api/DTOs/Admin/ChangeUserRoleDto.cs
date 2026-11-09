using System.ComponentModel.DataAnnotations;

namespace Dainynas.Api.DTOs.Admin;

public class ChangeUserRoleDto
{
    [Required]
    public string Role { get; set; } = string.Empty;
}
