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
[Authorize(Policy = "Module:resource-or-setting")]
public class TeamsController(AppDbContext db) : ControllerBase
{
    private static TeamResponse ToResponse(Team t) => new(t.Id, t.Name, t.ManagerId,
        t.Manager != null ? t.Manager.FirstName + " " + t.Manager.LastName : null,
        t.SecurityRoles.Select(r => new SecurityRoleRef(r.Id, r.Name)).OrderBy(r => r.Name).ToList(),
        t.Members.Count, t.CreatedAt);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var teams = await db.Teams.Include(t => t.Manager).Include(t => t.Members).Include(t => t.SecurityRoles).ToListAsync();
        return Ok(teams.Select(ToResponse).ToList());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var t = await db.Teams.Include(t => t.Manager).Include(t => t.Members).Include(t => t.SecurityRoles).FirstOrDefaultAsync(t => t.Id == id);
        if (t is null) return NotFound();
        return Ok(ToResponse(t));
    }

    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetMembers(Guid id)
    {
        var members = await db.Users.Where(u => u.Teams.Any(t => t.Id == id))
            .Select(u => new { u.Id, u.FirstName, u.LastName, u.Email, u.IsActive })
            .ToListAsync();
        return Ok(members);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(TeamRequest req)
    {
        var securityRoles = req.SecurityRoleIds is { Count: > 0 }
            ? await db.SecurityRoles.Where(r => req.SecurityRoleIds.Contains(r.Id)).ToListAsync()
            : [];

        var team = new Team { Name = req.Name, ManagerId = req.ManagerId, SecurityRoles = securityRoles };
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        var created = await db.Teams.Include(t => t.Manager).Include(t => t.Members).Include(t => t.SecurityRoles).FirstAsync(t => t.Id == team.Id);
        return CreatedAtAction(nameof(GetById), new { id = team.Id }, ToResponse(created));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, TeamRequest req)
    {
        var team = await db.Teams.Include(t => t.SecurityRoles).FirstOrDefaultAsync(t => t.Id == id);
        if (team is null) return NotFound();
        team.Name = req.Name; team.ManagerId = req.ManagerId;
        team.SecurityRoles = req.SecurityRoleIds is { Count: > 0 }
            ? await db.SecurityRoles.Where(r => req.SecurityRoleIds.Contains(r.Id)).ToListAsync()
            : [];
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var team = await db.Teams.FindAsync(id);
        if (team is null) return NotFound();
        db.Teams.Remove(team);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
