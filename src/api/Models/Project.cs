namespace CRMPlus.Api.Models;

public enum ProjectStatus { Planning, Active, OnHold, Completed, Cancelled }

public class Project
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Planning;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<WorkItem> WorkItems { get; set; } = [];
}
