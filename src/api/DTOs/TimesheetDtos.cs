using CRMPlus.Api.Models;

namespace CRMPlus.Api.DTOs;

public record TimesheetEntryRequest(Guid WorkItemId, DateTime Date, decimal Hours, string? Description);

public record TimesheetRequest(DateTime WeekStartDate, string? Notes, bool IsActive, List<TimesheetEntryRequest> Entries);

public record TimesheetReviewRequest(TimesheetStatus Status, string? Comments);

public record TimesheetEntryResponse(Guid Id, Guid WorkItemId, string WorkItemTitle, DateTime Date, decimal Hours, string? Description);

public record TimesheetListResponse(List<TimesheetResponse> Items, int TotalCount);

public record TimesheetResponse(
    Guid Id,
    Guid UserId,
    string UserName,
    DateTime WeekStartDate,
    string Status,
    bool IsActive,
    Guid? ApproverId,
    string? ApproverName,
    string? Notes,
    string? Comments,
    decimal TotalHours,
    DateTime CreatedAt,
    List<TimesheetEntryResponse> Entries);
