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
public class WorkItemsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? projectId, [FromQuery] bool myItems = false)
    {
        var query = db.WorkItems
            .Include(w => w.Project)
            .Include(w => w.AssignedUser)
            .AsQueryable();

        if (projectId.HasValue) query = query.Where(w => w.ProjectId == projectId);

        if (myItems)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            query = query.Where(w => w.AssignedUserId == userId);
        }

        var items = await query.OrderBy(w => w.Priority).ThenBy(w => w.DueDate)
            .Select(w => new WorkItemResponse(
                w.Id, w.Title, w.Description, w.ProjectId, w.Project!.Name,
                w.AssignedUserId, w.AssignedUser != null ? w.AssignedUser.FirstName + " " + w.AssignedUser.LastName : null,
                w.Status.ToString(), w.Priority.ToString(), w.DueDate,
                w.EstimatedHours, w.ActualHours, w.CreatedAt))
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var w = await db.WorkItems.Include(w => w.Project).Include(w => w.AssignedUser).FirstOrDefaultAsync(w => w.Id == id);
        if (w is null) return NotFound();
        return Ok(new WorkItemResponse(w.Id, w.Title, w.Description, w.ProjectId, w.Project!.Name,
            w.AssignedUserId, w.AssignedUser != null ? w.AssignedUser.FirstName + " " + w.AssignedUser.LastName : null,
            w.Status.ToString(), w.Priority.ToString(), w.DueDate, w.EstimatedHours, w.ActualHours, w.CreatedAt));
    }

    [HttpPost]
    public async Task<IActionResult> Create(WorkItemRequest req)
    {
        var workItem = new WorkItem
        {
            Title = req.Title, Description = req.Description, ProjectId = req.ProjectId,
            AssignedUserId = req.AssignedUserId, Status = req.Status, Priority = req.Priority,
            DueDate = req.DueDate, EstimatedHours = req.EstimatedHours,
        };
        db.WorkItems.Add(workItem);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = workItem.Id }, new { workItem.Id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, WorkItemRequest req)
    {
        var workItem = await db.WorkItems.FindAsync(id);
        if (workItem is null) return NotFound();

        workItem.Title = req.Title; workItem.Description = req.Description; workItem.ProjectId = req.ProjectId;
        workItem.AssignedUserId = req.AssignedUserId; workItem.Status = req.Status; workItem.Priority = req.Priority;
        workItem.DueDate = req.DueDate; workItem.EstimatedHours = req.EstimatedHours; workItem.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var workItem = await db.WorkItems.FindAsync(id);
        if (workItem is null) return NotFound();
        db.WorkItems.Remove(workItem);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
