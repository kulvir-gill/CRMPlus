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
public class TeamsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var teams = await db.Teams.Include(t => t.Manager).Include(t => t.Members)
            .Select(t => new TeamResponse(t.Id, t.Name, t.ManagerId,
                t.Manager != null ? t.Manager.FirstName + " " + t.Manager.LastName : null,
                t.Members.Count, t.CreatedAt))
            .ToListAsync();
        return Ok(teams);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var t = await db.Teams.Include(t => t.Manager).Include(t => t.Members).FirstOrDefaultAsync(t => t.Id == id);
        if (t is null) return NotFound();
        return Ok(new TeamResponse(t.Id, t.Name, t.ManagerId,
            t.Manager != null ? t.Manager.FirstName + " " + t.Manager.LastName : null,
            t.Members.Count, t.CreatedAt));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(TeamRequest req)
    {
        var team = new Team { Name = req.Name, ManagerId = req.ManagerId };
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = team.Id }, new TeamResponse(team.Id, team.Name, team.ManagerId, null, 0, team.CreatedAt));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, TeamRequest req)
    {
        var team = await db.Teams.FindAsync(id);
        if (team is null) return NotFound();
        team.Name = req.Name; team.ManagerId = req.ManagerId;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var team = await db.Teams.FindAsync(id);
        if (team is null) return NotFound();
        db.Teams.Remove(team);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
