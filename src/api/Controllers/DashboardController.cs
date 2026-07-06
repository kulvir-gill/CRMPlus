using System.Security.Claims;
using CRMPlus.Api.Data;
using CRMPlus.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRMPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var myWorkItems = await db.WorkItems
            .Include(w => w.Project)
            .Where(w => w.AssignedUserId == userId && w.Status != WorkItemStatus.Done && w.Status != WorkItemStatus.Cancelled)
            .OrderBy(w => w.DueDate)
            .Select(w => new
            {
                w.Id, w.Title, w.Status, w.Priority, w.DueDate,
                ProjectName = w.Project!.Name, w.EstimatedHours, w.ActualHours
            })
            .Take(10)
            .ToListAsync();

        var pendingTimesheets = await db.Timesheets
            .Where(t => t.Status == TimesheetStatus.Submitted)
            .CountAsync();

        var myTimesheets = await db.Timesheets
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.WeekStartDate)
            .Select(t => new { t.Id, t.WeekStartDate, t.Status, t.CreatedAt })
            .Take(5)
            .ToListAsync();

        var stats = new
        {
            TotalAccounts = await db.Accounts.CountAsync(),
            TotalContacts = await db.Contacts.CountAsync(),
            ActiveProjects = await db.Projects.CountAsync(p => p.Status == ProjectStatus.Active),
            OpenInvoices = await db.Invoices.CountAsync(i => i.Status == InvoiceStatus.Sent || i.Status == InvoiceStatus.Overdue),
        };

        return Ok(new { stats, myWorkItems, pendingTimesheets, myTimesheets });
    }
}
