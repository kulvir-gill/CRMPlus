using CRMPlus.Api.Data;
using CRMPlus.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRMPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await db.Users.Include(u => u.Team)
            .Where(u => u.IsActive)
            .OrderBy(u => u.LastName)
            .Select(u => new UserResponse(u.Id, u.FirstName, u.LastName, u.Email, u.Role.ToString(),
                u.TeamId, u.Team != null ? u.Team.Name : null, u.IsActive, u.CreatedAt))
            .ToListAsync();
        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var u = await db.Users.Include(u => u.Team).FirstOrDefaultAsync(u => u.Id == id);
        if (u is null) return NotFound();
        return Ok(new UserResponse(u.Id, u.FirstName, u.LastName, u.Email, u.Role.ToString(),
            u.TeamId, u.Team?.Name, u.IsActive, u.CreatedAt));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, UpdateUserRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();
        user.FirstName = req.FirstName; user.LastName = req.LastName;
        user.Role = req.Role; user.TeamId = req.TeamId; user.IsActive = req.IsActive;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
