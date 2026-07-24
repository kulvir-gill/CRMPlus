using System.Security.Claims;
using CRMPlus.Api.Data;
using CRMPlus.Api.DTOs;
using CRMPlus.Api.Models;
using CRMPlus.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRMPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Authorize(Policy = "Module:resource")]
public class TimesheetsController(AppDbContext db, CurrentUserService currentUser, OwnershipService ownership) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] bool myTimesheets = true, [FromQuery] bool pendingApproval = false,
        [FromQuery] TimesheetStatus? status = null,
        [FromQuery] string? search = null, [FromQuery] bool? isActive = null,
        [FromQuery] string sortField = "weekstartdate", [FromQuery] string sortDir = "desc",
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 1000);

        var query = db.Timesheets
            .Include(t => t.User)
            .Include(t => t.Approver)
            .Include(t => t.Entries).ThenInclude(e => e.WorkItem)
            .AsQueryable();

        if (myTimesheets) query = query.Where(t => t.UserId == CurrentUserId);
        else if (currentUser.GetAccessLevel(AppModules.Resource) == ModuleAccessLevel.UserLevel)
        {
            var visibleOwnerIds = await ownership.GetVisibleOwnerIdsAsync(currentUser.UserId);
            query = query.Where(t => visibleOwnerIds.Contains(t.UserId));
        }
        if (pendingApproval) query = query.Where(t => t.Status == TimesheetStatus.Submitted);
        if (status.HasValue) query = query.Where(t => t.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(t => t.Notes != null && t.Notes.Contains(search));
        if (isActive.HasValue)
            query = query.Where(t => t.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();
        query = ApplySort(query, sortField, sortDir);

        var timesheets = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new TimesheetListResponse(timesheets.Select(ToResponse).ToList(), totalCount));
    }

    private static IQueryable<Timesheet> ApplySort(IQueryable<Timesheet> query, string sortField, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortField.ToLowerInvariant() switch
        {
            "status" => desc ? query.OrderByDescending(t => t.Status) : query.OrderBy(t => t.Status),
            "totalhours" => desc
                ? query.OrderByDescending(t => t.Entries.Sum(e => (decimal?)e.Hours) ?? 0)
                : query.OrderBy(t => t.Entries.Sum(e => (decimal?)e.Hours) ?? 0),
            "createdat" => desc ? query.OrderByDescending(t => t.CreatedAt) : query.OrderBy(t => t.CreatedAt),
            _ => desc ? query.OrderByDescending(t => t.WeekStartDate) : query.OrderBy(t => t.WeekStartDate),
        };
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var t = await db.Timesheets
            .Include(t => t.User).Include(t => t.Approver)
            .Include(t => t.Entries).ThenInclude(e => e.WorkItem)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (t is null) return NotFound();
        if (t.UserId != CurrentUserId && currentUser.GetAccessLevel(AppModules.Resource) == ModuleAccessLevel.UserLevel)
        {
            var visibleOwnerIds = await ownership.GetVisibleOwnerIdsAsync(currentUser.UserId);
            if (!visibleOwnerIds.Contains(t.UserId)) return NotFound();
        }
        return Ok(ToResponse(t));
    }

    [HttpPost]
    public async Task<IActionResult> Create(TimesheetRequest req)
    {
        if (currentUser.GetAccessLevel(AppModules.Resource) == ModuleAccessLevel.ReadOnly) return Forbid();

        var weekDate = req.WeekStartDate.Date;
        var duplicate = await db.Timesheets.AnyAsync(t => t.UserId == CurrentUserId && t.WeekStartDate.Date == weekDate);
        if (duplicate)
            return BadRequest(new { message = "You already have a timesheet for this week." });

        if (ExceedsDailyLimit(req.Entries))
            return BadRequest(new { message = "Total hours for a single day cannot exceed 24." });

        var timesheet = new Timesheet
        {
            UserId = CurrentUserId,
            WeekStartDate = req.WeekStartDate,
            Notes = req.Notes,
            IsActive = req.IsActive,
            Entries = req.Entries.Select(e => new TimesheetEntry
            {
                WorkItemId = e.WorkItemId, Date = e.Date, Hours = e.Hours, Description = e.Description
            }).ToList()
        };
        db.Timesheets.Add(timesheet);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = timesheet.Id }, new { timesheet.Id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, TimesheetRequest req)
    {
        if (currentUser.GetAccessLevel(AppModules.Resource) == ModuleAccessLevel.ReadOnly) return Forbid();

        var timesheet = await db.Timesheets.Include(t => t.Entries).FirstOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);
        if (timesheet is null) return NotFound();
        if (timesheet.Status != TimesheetStatus.Draft) return BadRequest(new { message = "Only draft timesheets can be edited." });

        var weekDate = req.WeekStartDate.Date;
        var duplicate = await db.Timesheets.AnyAsync(t => t.UserId == CurrentUserId && t.Id != id && t.WeekStartDate.Date == weekDate);
        if (duplicate)
            return BadRequest(new { message = "You already have a timesheet for this week." });

        if (ExceedsDailyLimit(req.Entries))
            return BadRequest(new { message = "Total hours for a single day cannot exceed 24." });

        timesheet.WeekStartDate = req.WeekStartDate;
        timesheet.Notes = req.Notes;
        timesheet.IsActive = req.IsActive;
        timesheet.UpdatedAt = DateTime.UtcNow;
        db.TimesheetEntries.RemoveRange(timesheet.Entries);
        timesheet.Entries = req.Entries.Select(e => new TimesheetEntry
        {
            WorkItemId = e.WorkItemId, Date = e.Date, Hours = e.Hours, Description = e.Description
        }).ToList();

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/submit")]
    public async Task<IActionResult> Submit(Guid id)
    {
        if (currentUser.GetAccessLevel(AppModules.Resource) == ModuleAccessLevel.ReadOnly) return Forbid();

        var timesheet = await db.Timesheets.FirstOrDefaultAsync(t => t.Id == id && t.UserId == CurrentUserId);
        if (timesheet is null) return NotFound();
        if (timesheet.Status != TimesheetStatus.Draft) return BadRequest(new { message = "Only draft timesheets can be submitted" });

        timesheet.Status = TimesheetStatus.Submitted;
        timesheet.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/review")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> Review(Guid id, TimesheetReviewRequest req)
    {
        var timesheet = await db.Timesheets.FirstOrDefaultAsync(t => t.Id == id && t.Status == TimesheetStatus.Submitted);
        if (timesheet is null) return NotFound();

        timesheet.Status = req.Status;
        timesheet.ApproverId = CurrentUserId;
        timesheet.Comments = req.Comments;
        timesheet.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("bulk-status")]
    public async Task<IActionResult> BulkSetStatus(BulkStatusRequest req)
    {
        if (currentUser.GetAccessLevel(AppModules.Resource) == ModuleAccessLevel.ReadOnly) return Forbid();

        if (req.Ids is null || req.Ids.Count == 0)
            return BadRequest(new { message = "No timesheets selected." });

        var idQuery = db.Timesheets.Where(t => req.Ids.Contains(t.Id));
        if (currentUser.GetAccessLevel(AppModules.Resource) == ModuleAccessLevel.UserLevel)
            idQuery = idQuery.Where(t => t.UserId == currentUser.UserId);
        var timesheets = await idQuery.ToListAsync();
        foreach (var timesheet in timesheets)
        {
            timesheet.IsActive = req.IsActive;
            timesheet.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return Ok(new { updated = timesheets.Count });
    }

    private static bool ExceedsDailyLimit(List<TimesheetEntryRequest> entries) =>
        entries.GroupBy(e => e.Date.Date).Any(g => g.Sum(e => e.Hours) > 24);

    private static TimesheetResponse ToResponse(Timesheet t) => new(
        t.Id,
        t.UserId,
        t.User!.FirstName + " " + t.User.LastName,
        t.WeekStartDate,
        t.Status.ToString(),
        t.IsActive,
        t.ApproverId,
        t.Approver != null ? t.Approver.FirstName + " " + t.Approver.LastName : null,
        t.Notes,
        t.Comments,
        t.Entries.Sum(e => e.Hours),
        t.CreatedAt,
        t.Entries.Select(e => new TimesheetEntryResponse(
            e.Id, e.WorkItemId, e.WorkItem?.Title ?? "", e.Date, e.Hours, e.Description)).ToList());
}
