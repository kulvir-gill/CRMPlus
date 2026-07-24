namespace CRMPlus.Api.Models;

public class Team
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public Guid? ManagerId { get; set; }
    public User? Manager { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<User> Members { get; set; } = [];
    public ICollection<SecurityRole> SecurityRoles { get; set; } = [];
}
