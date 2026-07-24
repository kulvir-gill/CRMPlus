namespace CRMPlus.Api.Models;

public enum WorkItemStatus { Backlog, InProgress, InReview, Done, Cancelled }
public enum WorkItemPriority { Low, Medium, High, Critical }

public class WorkItem
{
    public Guid Id { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }
    public Guid? AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }
    public Guid? AssignedTeamId { get; set; }
    public Team? AssignedTeam { get; set; }
    public WorkItemStatus Status { get; set; } = WorkItemStatus.Backlog;
    public WorkItemPriority Priority { get; set; } = WorkItemPriority.Medium;
    public bool IsActive { get; set; } = true;
    public DateTime? DueDate { get; set; }
    public decimal EstimatedHours { get; set; }
    public decimal ActualHours { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<TimesheetEntry> TimesheetEntries { get; set; } = [];
}
