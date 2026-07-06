namespace CRMPlus.Api.Models;

public enum WorkItemStatus { Backlog, InProgress, InReview, Done, Cancelled }
public enum WorkItemPriority { Low, Medium, High, Critical }

public class WorkItem
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public int ProjectId { get; set; }
    public Project? Project { get; set; }
    public int? AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }
    public WorkItemStatus Status { get; set; } = WorkItemStatus.Backlog;
    public WorkItemPriority Priority { get; set; } = WorkItemPriority.Medium;
    public DateTime? DueDate { get; set; }
    public decimal EstimatedHours { get; set; }
    public decimal ActualHours { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<TimesheetEntry> TimesheetEntries { get; set; } = [];
}
