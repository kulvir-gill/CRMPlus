namespace CRMPlus.Api.Models;

public enum TimesheetStatus { Draft, Submitted, Approved, Rejected }

public class Timesheet
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public DateTime WeekStartDate { get; set; }
    public TimesheetStatus Status { get; set; } = TimesheetStatus.Draft;
    public int? ApproverId { get; set; }
    public User? Approver { get; set; }
    public string? Notes { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<TimesheetEntry> Entries { get; set; } = [];
}

public class TimesheetEntry
{
    public int Id { get; set; }
    public int TimesheetId { get; set; }
    public Timesheet? Timesheet { get; set; }
    public int WorkItemId { get; set; }
    public WorkItem? WorkItem { get; set; }
    public DateTime Date { get; set; }
    public decimal Hours { get; set; }
    public string? Description { get; set; }
}
