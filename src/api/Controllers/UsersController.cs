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
public class UsersController(AppDbContext db) : ControllerBase
{
    private static IQueryable<Models.User> WithDetails(IQueryable<Models.User> query) =>
        query.Include(u => u.Teams).ThenInclude(t => t.SecurityRoles)
             .Include(u => u.SecurityRoles)
             .Include(u => u.Manager);

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search = null, [FromQuery] bool? isActive = null,
        [FromQuery] string sortField = "lastname", [FromQuery] string sortDir = "asc",
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 1000);

        var query = WithDetails(db.Users.AsQueryable());

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u => u.FirstName.Contains(search) || u.LastName.Contains(search) || u.Email.Contains(search));
        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();
        query = ApplySort(query, sortField, sortDir);

        var users = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new UserListResponse(users.Select(ToResponse).ToList(), totalCount));
    }

    private static IQueryable<Models.User> ApplySort(IQueryable<Models.User> query, string sortField, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortField.ToLowerInvariant() switch
        {
            "firstname" => desc ? query.OrderByDescending(u => u.FirstName) : query.OrderBy(u => u.FirstName),
            "email" => desc ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email),
            "role" => desc
                ? query.OrderByDescending(u => u.SecurityRoles.OrderBy(r => r.Name).Select(r => r.Name).FirstOrDefault())
                : query.OrderBy(u => u.SecurityRoles.OrderBy(r => r.Name).Select(r => r.Name).FirstOrDefault()),
            "team" => desc
                ? query.OrderByDescending(u => u.Teams.OrderBy(t => t.Name).Select(t => t.Name).FirstOrDefault())
                : query.OrderBy(u => u.Teams.OrderBy(t => t.Name).Select(t => t.Name).FirstOrDefault()),
            _ => desc ? query.OrderByDescending(u => u.LastName) : query.OrderBy(u => u.LastName),
        };
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var u = await WithDetails(db.Users.AsQueryable()).FirstOrDefaultAsync(u => u.Id == id);
        if (u is null) return NotFound();
        return Ok(ToResponse(u));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(CreateUserRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            return BadRequest(new { message = "A user with this email already exists." });

        var securityRoles = req.SecurityRoleIds is { Count: > 0 }
            ? await db.SecurityRoles.Where(r => req.SecurityRoleIds.Contains(r.Id)).ToListAsync()
            : [];
        var teams = req.TeamIds is { Count: > 0 }
            ? await db.Teams.Where(t => req.TeamIds.Contains(t.Id)).ToListAsync()
            : [];

        var user = new Models.User
        {
            FirstName = req.FirstName, LastName = req.LastName, Email = req.Email, Title = req.Title,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            SecurityRoles = securityRoles, Teams = teams, ManagerId = req.ManagerId, IsActive = req.IsActive,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        var created = await WithDetails(db.Users.AsQueryable()).FirstAsync(u => u.Id == user.Id);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, ToResponse(created));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, UpdateUserRequest req)
    {
        if (req.ManagerId == id)
            return BadRequest(new { message = "A user cannot be their own manager." });

        var user = await db.Users.Include(u => u.Teams).Include(u => u.SecurityRoles).FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();
        user.FirstName = req.FirstName; user.LastName = req.LastName; user.Title = req.Title;
        user.SecurityRoles = req.SecurityRoleIds is { Count: > 0 }
            ? await db.SecurityRoles.Where(r => req.SecurityRoleIds.Contains(r.Id)).ToListAsync()
            : [];
        user.Teams = req.TeamIds is { Count: > 0 }
            ? await db.Teams.Where(t => req.TeamIds.Contains(t.Id)).ToListAsync()
            : [];
        user.ManagerId = req.ManagerId;
        user.IsActive = req.IsActive;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/reset-password")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ResetPassword(Guid id, ResetPasswordRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 6)
            return BadRequest(new { message = "Password must be at least 6 characters." });

        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("bulk-status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> BulkSetStatus(BulkStatusRequest req)
    {
        if (req.Ids is null || req.Ids.Count == 0)
            return BadRequest(new { message = "No users selected." });

        var users = await db.Users.Where(u => req.Ids.Contains(u.Id)).ToListAsync();
        foreach (var user in users)
            user.IsActive = req.IsActive;

        await db.SaveChangesAsync();
        return Ok(new { updated = users.Count });
    }

    private static UserResponse ToResponse(Models.User u)
    {
        var inherited = u.Teams.SelectMany(t => t.SecurityRoles)
            .GroupBy(r => r.Id)
            .Select(g => new SecurityRoleRef(g.Key, g.First().Name))
            .OrderBy(r => r.Name)
            .ToList();

        return new(
            u.Id, u.FirstName, u.LastName, u.Email, u.Title,
            u.SecurityRoles.Select(r => new SecurityRoleRef(r.Id, r.Name)).OrderBy(r => r.Name).ToList(),
            inherited,
            u.Teams.Select(t => t.Id).ToList(), u.Teams.Select(t => t.Name).ToList(),
            u.ManagerId, u.Manager is null ? null : $"{u.Manager.FirstName} {u.Manager.LastName}", u.IsActive, u.CreatedAt);
    }
}
