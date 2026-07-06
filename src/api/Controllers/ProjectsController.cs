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
public class ProjectsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        var query = db.Projects.Include(p => p.WorkItems).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search));

        var projects = await query.OrderBy(p => p.Name)
            .Select(p => new ProjectResponse(p.Id, p.Name, p.Description, p.Status.ToString(),
                p.StartDate, p.EndDate, p.WorkItems.Count, p.CreatedAt))
            .ToListAsync();

        return Ok(projects);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var p = await db.Projects.Include(p => p.WorkItems).FirstOrDefaultAsync(p => p.Id == id);
        if (p is null) return NotFound();
        return Ok(new ProjectResponse(p.Id, p.Name, p.Description, p.Status.ToString(),
            p.StartDate, p.EndDate, p.WorkItems.Count, p.CreatedAt));
    }

    [HttpPost]
    public async Task<IActionResult> Create(ProjectRequest req)
    {
        var project = new Project
        {
            Name = req.Name, Description = req.Description, Status = req.Status,
            StartDate = req.StartDate, EndDate = req.EndDate,
        };
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = project.Id },
            new ProjectResponse(project.Id, project.Name, project.Description, project.Status.ToString(),
                project.StartDate, project.EndDate, 0, project.CreatedAt));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, ProjectRequest req)
    {
        var project = await db.Projects.FindAsync(id);
        if (project is null) return NotFound();

        project.Name = req.Name; project.Description = req.Description; project.Status = req.Status;
        project.StartDate = req.StartDate; project.EndDate = req.EndDate; project.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var project = await db.Projects.FindAsync(id);
        if (project is null) return NotFound();
        db.Projects.Remove(project);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
