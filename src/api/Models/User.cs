namespace CRMPlus.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Title { get; set; }
    public string PasswordHash { get; set; } = "";
    public ICollection<SecurityRole> SecurityRoles { get; set; } = [];
    public ICollection<Team> Teams { get; set; } = [];
    public Guid? ManagerId { get; set; }
    public User? Manager { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<WorkItem> AssignedWorkItems { get; set; } = [];
    public ICollection<Timesheet> Timesheets { get; set; } = [];
}
