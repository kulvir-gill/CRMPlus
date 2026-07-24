using CRMPlus.Api.Data;
using CRMPlus.Api.DTOs;
using CRMPlus.Api.Models;
using CRMPlus.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRMPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext db, TokenService tokenService) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var user = await db.Users
            .Include(u => u.SecurityRoles)
            .Include(u => u.Teams).ThenInclude(t => t.SecurityRoles)
            .FirstOrDefaultAsync(u => u.Email == req.Email && u.IsActive);
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password" });

        var token = tokenService.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.Email, user.FirstName, user.LastName, TokenService.EffectiveRoleNames(user), TokenService.EffectiveModuleKeys(user), TokenService.EffectiveModuleAccessStrings(user)));
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            return Conflict(new { message = "Email already registered" });

        var securityRoles = req.SecurityRoleIds is { Count: > 0 }
            ? await db.SecurityRoles.Where(r => req.SecurityRoleIds.Contains(r.Id)).ToListAsync()
            : await db.SecurityRoles.Where(r => r.Name == "Employee").ToListAsync();
        var teams = req.TeamIds is { Count: > 0 }
            ? await db.Teams.Include(t => t.SecurityRoles).Where(t => req.TeamIds.Contains(t.Id)).ToListAsync()
            : [];
        var user = new User
        {
            FirstName = req.FirstName,
            LastName = req.LastName,
            Email = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            SecurityRoles = securityRoles,
            Teams = teams,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        var token = tokenService.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.Email, user.FirstName, user.LastName, TokenService.EffectiveRoleNames(user), TokenService.EffectiveModuleKeys(user), TokenService.EffectiveModuleAccessStrings(user)));
    }
}
