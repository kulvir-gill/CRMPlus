namespace CRMPlus.Api.Models;

// Higher value = more access, so "most permissive wins" across a user's roles is just Math.Max.
public enum ModuleAccessLevel { ReadOnly = 0, UserLevel = 1, Full = 2 }

public class SecurityRole
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string Modules { get; set; } = "";
    public ModuleAccessLevel AccessLevel { get; set; } = ModuleAccessLevel.Full;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<User> Users { get; set; } = [];
    public ICollection<Team> Teams { get; set; } = [];
}
