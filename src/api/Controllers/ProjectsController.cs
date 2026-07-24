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
public class ProjectsController(AppDbContext db, CurrentUserService currentUser, OwnershipService ownership) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search, [FromQuery] bool? isActive,
        [FromQuery] string sortField = "name", [FromQuery] string sortDir = "asc",
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 1000);

        var query = db.Projects.Include(p => p.WorkItems).Include(p => p.Owner).Include(p => p.OwnerTeam).AsQueryable();

        if (currentUser.GetAccessLevel(AppModules.Resource) == ModuleAccessLevel.UserLevel)
        {
            var visibleOwnerIds = await ownership.GetVisibleOwnerIdsAsync(currentUser.UserId);
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            query = query.Where(p =>
                (p.OwnerId != null && visibleOwnerIds.Contains(p.OwnerId.Value)) ||
                (p.OwnerTeamId != null && userTeamIds.Contains(p.OwnerTeamId.Value)));
        }

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search) || (p.Description != null && p.Description.Contains(search)));
        if (isActive.HasValue)
            query = query.Where(p => p.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();
        query = ApplySort(query, sortField, sortDir);

        var projects = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new ProjectListResponse(projects.Select(ToResponse).ToList(), totalCount));
    }

    private static IQueryable<Project> ApplySort(IQueryable<Project> query, string sortField, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortField.ToLowerInvariant() switch
        {
            "status" => desc ? query.OrderByDescending(p => p.Status) : query.OrderBy(p => p.Status),
            "startdate" => desc ? query.OrderByDescending(p => p.StartDate) : query.OrderBy(p => p.StartDate),
            "enddate" => desc ? query.OrderByDescending(p => p.EndDate) : query.OrderBy(p => p.EndDate),
            "workitemcount" => desc ? query.OrderByDescending(p => p.WorkItems.Count) : query.OrderBy(p => p.WorkItems.Count),
            "createdat" => desc ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt),
            _ => desc ? query.OrderByDescending(p => p.Name) : query.OrderBy(p => p.Name),
        };
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var p = await db.Projects.Include(p => p.WorkItems).Include(p => p.Owner).Include(p => p.OwnerTeam).FirstOrDefaultAsync(p => p.Id == id);
        if (p is null) return NotFound();
        if (currentUser.GetAccessLevel(AppModules.Resource) == ModuleAccessLevel.UserLevel &&
            !await ownership.IsVisibleAsync(currentUser.UserId, p.OwnerId, p.OwnerTeamId))
            return NotFound();
        return Ok(ToResponse(p));
    }

    [HttpPost]
    public async Task<IActionResult> Create(ProjectRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Resource);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "A project can be owned by a user or a team, not both." });

        Guid? ownerId = req.OwnerId, ownerTeamId = req.OwnerTeamId;
        if (level == ModuleAccessLevel.UserLevel)
            (ownerId, ownerTeamId) = await ownership.ResolveUserLevelOwnershipAsync(currentUser.UserId, req.OwnerId, req.OwnerTeamId);
        else if (ownerId is null && ownerTeamId is null)
            ownerId = currentUser.UserId;

        var project = new Project
        {
            Name = req.Name, Description = req.Description, Status = req.Status, IsActive = req.IsActive,
            StartDate = req.StartDate, EndDate = req.EndDate,
            OwnerId = ownerId, OwnerTeamId = ownerTeamId,
        };
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = project.Id }, ToResponse(project));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, ProjectRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Resource);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "A project can be owned by a user or a team, not both." });

        var project = await db.Projects.FindAsync(id);
        if (project is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, project.OwnerId, project.OwnerTeamId)) return Forbid();

        project.Name = req.Name; project.Description = req.Description; project.Status = req.Status;
        project.IsActive = req.IsActive;
        project.StartDate = req.StartDate; project.EndDate = req.EndDate;
        project.OwnerId = req.OwnerId; project.OwnerTeamId = req.OwnerTeamId; project.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("bulk-status")]
    public async Task<IActionResult> BulkSetStatus(BulkStatusRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Resource);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        if (req.Ids is null || req.Ids.Count == 0)
            return BadRequest(new { message = "No projects selected." });

        var idQuery = db.Projects.Where(p => req.Ids.Contains(p.Id));
        if (level == ModuleAccessLevel.UserLevel)
        {
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            idQuery = idQuery.Where(p =>
                p.OwnerId == currentUser.UserId ||
                (p.OwnerTeamId != null && userTeamIds.Contains(p.OwnerTeamId.Value)));
        }
        var projects = await idQuery.ToListAsync();
        foreach (var project in projects)
        {
            project.IsActive = req.IsActive;
            project.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return Ok(new { updated = projects.Count });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Resource);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var project = await db.Projects.FindAsync(id);
        if (project is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, project.OwnerId, project.OwnerTeamId)) return Forbid();

        db.Projects.Remove(project);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static ProjectResponse ToResponse(Project p) => new(
        p.Id, p.Name, p.Description, p.Status.ToString(), p.IsActive,
        p.StartDate, p.EndDate, p.WorkItems.Count, p.CreatedAt,
        p.OwnerId, p.Owner is not null ? $"{p.Owner.FirstName} {p.Owner.LastName}" : null,
        p.OwnerTeamId, p.OwnerTeam?.Name);
}
