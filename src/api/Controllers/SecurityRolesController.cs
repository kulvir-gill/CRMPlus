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
[Authorize(Policy = "Module:setting")]
public class SecurityRolesController(AppDbContext db) : ControllerBase
{
    private static List<string> SplitModules(string raw) =>
        string.IsNullOrWhiteSpace(raw) ? [] : raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

    private static SecurityRoleResponse ToResponse(SecurityRole r) =>
        new(r.Id, r.Name, r.Description, SplitModules(r.Modules), r.AccessLevel.ToString(), r.CreatedAt);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var roles = await db.SecurityRoles.OrderBy(r => r.Name).ToListAsync();
        return Ok(roles.Select(ToResponse).ToList());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var r = await db.SecurityRoles.FindAsync(id);
        if (r is null) return NotFound();
        return Ok(ToResponse(r));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(SecurityRoleRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });
        if (await db.SecurityRoles.AnyAsync(r => r.Name == req.Name))
            return BadRequest(new { message = "A security role with this name already exists." });

        var modules = (req.Modules ?? []).Where(m => AppModules.Assignable.Contains(m)).Distinct();
        if (!Enum.TryParse<ModuleAccessLevel>(req.AccessLevel, out var accessLevel))
            accessLevel = ModuleAccessLevel.Full;

        var role = new SecurityRole { Name = req.Name.Trim(), Description = req.Description, Modules = string.Join(",", modules), AccessLevel = accessLevel };
        db.SecurityRoles.Add(role);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = role.Id }, ToResponse(role));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, SecurityRoleRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Name is required." });
        if (await db.SecurityRoles.AnyAsync(r => r.Name == req.Name && r.Id != id))
            return BadRequest(new { message = "A security role with this name already exists." });

        var role = await db.SecurityRoles.FindAsync(id);
        if (role is null) return NotFound();
        var modules = (req.Modules ?? []).Where(m => AppModules.Assignable.Contains(m)).Distinct();
        if (!Enum.TryParse<ModuleAccessLevel>(req.AccessLevel, out var accessLevel))
            accessLevel = ModuleAccessLevel.Full;

        role.Name = req.Name.Trim();
        role.Description = req.Description;
        role.Modules = string.Join(",", modules);
        role.AccessLevel = accessLevel;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var role = await db.SecurityRoles.FindAsync(id);
        if (role is null) return NotFound();
        db.SecurityRoles.Remove(role);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
