namespace CRMPlus.Api.Models;

public enum UserRole { Employee, Manager, Admin }

public class User
{
    public int Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public UserRole Role { get; set; } = UserRole.Employee;
    public int? TeamId { get; set; }
    public Team? Team { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<WorkItem> AssignedWorkItems { get; set; } = [];
    public ICollection<Timesheet> Timesheets { get; set; } = [];
}
