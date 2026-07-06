namespace CRMPlus.Api.Models;

public class Team
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int? ManagerId { get; set; }
    public User? Manager { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<User> Members { get; set; } = [];
}
