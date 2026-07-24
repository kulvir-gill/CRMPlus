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
public class WorkItemsController(AppDbContext db, CurrentUserService currentUser, OwnershipService ownership) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? projectId, [FromQuery] bool myItems = false,
        [FromQuery] Guid? assignedUserId = null, [FromQuery] Guid? assignedTeamId = null, [FromQuery] DateTime? dueFrom = null, [FromQuery] DateTime? dueTo = null,
        [FromQuery] bool unscheduled = false,
        [FromQuery] string? search = null, [FromQuery] bool? isActive = null,
        [FromQuery] string sortField = "title", [FromQuery] string sortDir = "asc",
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 1000);

        var query = db.WorkItems
            .Include(w => w.Project)
            .Include(w => w.AssignedUser)
            .Include(w => w.AssignedTeam)
            .AsQueryable();

        if (currentUser.GetAccessLevel(AppModules.Resource) == ModuleAccessLevel.UserLevel)
        {
            var visibleOwnerIds = await ownership.GetVisibleOwnerIdsAsync(currentUser.UserId);
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            query = query.Where(w =>
                (w.AssignedUserId != null && visibleOwnerIds.Contains(w.AssignedUserId.Value)) ||
                (w.AssignedTeamId != null && userTeamIds.Contains(w.AssignedTeamId.Value)));
        }

        if (projectId.HasValue) query = query.Where(w => w.ProjectId == projectId);
        if (assignedUserId.HasValue) query = query.Where(w => w.AssignedUserId == assignedUserId);
        if (assignedTeamId.HasValue) query = query.Where(w => w.AssignedTeamId == assignedTeamId);
        if (unscheduled) query = query.Where(w => w.DueDate == null);
        if (dueFrom.HasValue) query = query.Where(w => w.DueDate >= dueFrom.Value);
        if (dueTo.HasValue) query = query.Where(w => w.DueDate < dueTo.Value);

        if (myItems)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            query = query.Where(w => w.AssignedUserId == userId);
        }

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(w => w.Title.Contains(search));
        if (isActive.HasValue)
            query = query.Where(w => w.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();
        query = ApplySort(query, sortField, sortDir);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new WorkItemListResponse(items.Select(ToResponse).ToList(), totalCount));
    }

    private static IQueryable<WorkItem> ApplySort(IQueryable<WorkItem> query, string sortField, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortField.ToLowerInvariant() switch
        {
            "project" => desc ? query.OrderByDescending(w => w.Project!.Name) : query.OrderBy(w => w.Project!.Name),
            "assignee" => desc ? query.OrderByDescending(w => w.AssignedUser!.FirstName) : query.OrderBy(w => w.AssignedUser!.FirstName),
            "status" => desc ? query.OrderByDescending(w => w.Status) : query.OrderBy(w => w.Status),
            "priority" => desc ? query.OrderByDescending(w => w.Priority) : query.OrderBy(w => w.Priority),
            "duedate" => desc ? query.OrderByDescending(w => w.DueDate) : query.OrderBy(w => w.DueDate),
            "estimatedhours" => desc ? query.OrderByDescending(w => w.EstimatedHours) : query.OrderBy(w => w.EstimatedHours),
            "actualhours" => desc ? query.OrderByDescending(w => w.ActualHours) : query.OrderBy(w => w.ActualHours),
            "createdat" => desc ? query.OrderByDescending(w => w.CreatedAt) : query.OrderBy(w => w.CreatedAt),
            _ => desc ? query.OrderByDescending(w => w.Title) : query.OrderBy(w => w.Title),
        };
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var w = await db.WorkItems.Include(w => w.Project).Include(w => w.AssignedUser).Include(w => w.AssignedTeam).FirstOrDefaultAsync(w => w.Id == id);
        if (w is null) return NotFound();
        if (currentUser.GetAccessLevel(AppModules.Resource) == ModuleAccessLevel.UserLevel &&
            !await ownership.IsVisibleAsync(currentUser.UserId, w.AssignedUserId, w.AssignedTeamId))
            return NotFound();
        return Ok(ToResponse(w));
    }

    [HttpPost]
    public async Task<IActionResult> Create(WorkItemRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Resource);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        if (req.AssignedUserId.HasValue && req.AssignedTeamId.HasValue)
            return BadRequest(new { message = "A work item can be assigned to a user or a team, not both." });

        var (assignedUserId, assignedTeamId) = level == ModuleAccessLevel.UserLevel
            ? await ownership.ResolveUserLevelOwnershipAsync(currentUser.UserId, req.AssignedUserId, req.AssignedTeamId)
            : (req.AssignedUserId, req.AssignedTeamId);

        if (await HasOverlapAsync(assignedUserId, req.DueDate, req.EstimatedHours, null))
            return BadRequest(new { message = "This assignee already has a work item scheduled at an overlapping time." });

        var workItem = new WorkItem
        {
            Title = req.Title, Description = req.Description, ProjectId = req.ProjectId,
            AssignedUserId = assignedUserId, AssignedTeamId = assignedTeamId, Status = req.Status, Priority = req.Priority,
            IsActive = req.IsActive, DueDate = req.DueDate, EstimatedHours = req.EstimatedHours,
        };
        db.WorkItems.Add(workItem);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = workItem.Id }, new { workItem.Id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, WorkItemRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Resource);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var workItem = await db.WorkItems.FindAsync(id);
        if (workItem is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, workItem.AssignedUserId, workItem.AssignedTeamId)) return Forbid();

        if (req.AssignedUserId.HasValue && req.AssignedTeamId.HasValue)
            return BadRequest(new { message = "A work item can be assigned to a user or a team, not both." });
        if (await HasOverlapAsync(req.AssignedUserId, req.DueDate, req.EstimatedHours, id))
            return BadRequest(new { message = "This assignee already has a work item scheduled at an overlapping time." });

        workItem.Title = req.Title; workItem.Description = req.Description; workItem.ProjectId = req.ProjectId;
        workItem.AssignedUserId = req.AssignedUserId; workItem.AssignedTeamId = req.AssignedTeamId; workItem.Status = req.Status; workItem.Priority = req.Priority;
        workItem.IsActive = req.IsActive;
        workItem.DueDate = req.DueDate; workItem.EstimatedHours = req.EstimatedHours; workItem.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<bool> HasOverlapAsync(Guid? assignedUserId, DateTime? start, decimal estimatedHours, Guid? excludeId)
    {
        if (!assignedUserId.HasValue || !start.HasValue) return false;
        var end = start.Value.AddHours((double)estimatedHours);

        var candidates = await db.WorkItems
            .Where(w => w.AssignedUserId == assignedUserId && w.IsActive && w.DueDate != null && w.Id != excludeId)
            .Select(w => new { w.DueDate, w.EstimatedHours })
            .ToListAsync();

        foreach (var c in candidates)
        {
            var cStart = c.DueDate!.Value;
            var cEnd = cStart.AddHours((double)c.EstimatedHours);
            if (start.Value < cEnd && cStart < end) return true;
        }
        return false;
    }

    [HttpPut("bulk-status")]
    public async Task<IActionResult> BulkSetStatus(BulkStatusRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Resource);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        if (req.Ids is null || req.Ids.Count == 0)
            return BadRequest(new { message = "No work items selected." });

        var idQuery = db.WorkItems.Where(w => req.Ids.Contains(w.Id));
        if (level == ModuleAccessLevel.UserLevel)
        {
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            idQuery = idQuery.Where(w =>
                w.AssignedUserId == currentUser.UserId ||
                (w.AssignedTeamId != null && userTeamIds.Contains(w.AssignedTeamId.Value)));
        }
        var items = await idQuery.ToListAsync();
        foreach (var item in items)
        {
            item.IsActive = req.IsActive;
            item.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return Ok(new { updated = items.Count });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Resource);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var workItem = await db.WorkItems.FindAsync(id);
        if (workItem is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, workItem.AssignedUserId, workItem.AssignedTeamId)) return Forbid();

        db.WorkItems.Remove(workItem);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static WorkItemResponse ToResponse(WorkItem w) => new(
        w.Id, w.Title, w.Description, w.ProjectId, w.Project!.Name,
        w.AssignedUserId, w.AssignedUser != null ? w.AssignedUser.FirstName + " " + w.AssignedUser.LastName : null,
        w.AssignedTeamId, w.AssignedTeam?.Name,
        w.Status.ToString(), w.Priority.ToString(), w.IsActive, w.DueDate,
        w.EstimatedHours, w.ActualHours, w.CreatedAt);
}
