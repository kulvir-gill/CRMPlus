using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record TimesheetEntryRequest(int WorkItemId, DateTime Date, decimal Hours, string? Description);

public record TimesheetRequest(DateTime WeekStartDate, string? Notes, List<TimesheetEntryRequest> Entries);

public record TimesheetReviewRequest(TimesheetStatus Status, string? RejectionReason);

public record TimesheetEntryResponse(int Id, int WorkItemId, string WorkItemTitle, DateTime Date, decimal Hours, string? Description);

public record TimesheetResponse(
    int Id,
    int UserId,
    string UserName,
    DateTime WeekStartDate,
    string Status,
    int? ApproverId,
    string? ApproverName,
    string? Notes,
    string? RejectionReason,
    decimal TotalHours,
    DateTime CreatedAt,
    List<TimesheetEntryResponse> Entries);
