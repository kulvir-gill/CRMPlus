using System.Security.Claims;
using CRMPlus.Api.Data;
using CRMPlus.Api.DTOs;
using CRMPlus.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRMPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimesheetsController(AppDbContext db) : ControllerBase
{
    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool myTimesheets = true, [FromQuery] bool pendingApproval = false)
    {
        var query = db.Timesheets
            .Include(t => t.User)
            .Include(t => t.Approver)
            .Include(t => t.Entries).ThenInclude(e => e.WorkItem)
            .AsQueryable();

        if (myTimesheets) query = query.Where(t => t.UserId == CurrentUserId);
        if (pendingApproval) query = query.Where(t => t.Status == TimesheetStatus.Submitted);

        var timesheets = await query.OrderByDescending(t => t.WeekStartDate)
            .Select(t => ToResponse(t))
            .ToListAsync();

        return Ok(timesheets);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var t = await db.Timesheets
            .Include(t => t.User).Include(t => t.Approver)
            .Include(t => t.Entries).ThenInclude(e => e.WorkItem)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (t is null) return NotFound();
        return Ok(ToResponse(t));
    }

    [HttpPost]
    public async Task<IActionResult> Create(TimesheetRequest req)
    {
        var timesheet = new Timesheet
        {
            UserId = CurrentUserId,
            WeekStartDate = req.WeekStartDate,
            Notes = req.Notes,
            Entries = req.Entries.Select(e => new TimesheetEntry
            {
                WorkItemId = e.WorkItemId, Date = e.Date, Hours = e.Hours, Description = e.Description
            }).ToList()
        };
        db.Timesheets.Add(timesheet);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = timesheet.Id }, new { timesheet.Id });
    }

    [HttpPost("{id}/submit")]
    public async Task<IActionResult> Submit(int id)
    {
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
    public async Task<IActionResult> Review(int id, TimesheetReviewRequest req)
    {
        var timesheet = await db.Timesheets.FirstOrDefaultAsync(t => t.Id == id && t.Status == TimesheetStatus.Submitted);
        if (timesheet is null) return NotFound();

        timesheet.Status = req.Status;
        timesheet.ApproverId = CurrentUserId;
        timesheet.RejectionReason = req.RejectionReason;
        timesheet.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static TimesheetResponse ToResponse(Timesheet t) => new(
        t.Id,
        t.UserId,
        t.User!.FirstName + " " + t.User.LastName,
        t.WeekStartDate,
        t.Status.ToString(),
        t.ApproverId,
        t.Approver != null ? t.Approver.FirstName + " " + t.Approver.LastName : null,
        t.Notes,
        t.RejectionReason,
        t.Entries.Sum(e => e.Hours),
        t.CreatedAt,
        t.Entries.Select(e => new TimesheetEntryResponse(
            e.Id, e.WorkItemId, e.WorkItem?.Title ?? "", e.Date, e.Hours, e.Description)).ToList());
}
