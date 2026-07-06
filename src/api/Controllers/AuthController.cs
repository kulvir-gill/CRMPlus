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
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email && u.IsActive);
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password" });

        var token = tokenService.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.Email, user.FirstName, user.LastName, user.Role.ToString()));
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            return Conflict(new { message = "Email already registered" });

        var user = new User
        {
            FirstName = req.FirstName,
            LastName = req.LastName,
            Email = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = req.Role,
            TeamId = req.TeamId,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        var token = tokenService.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.Email, user.FirstName, user.LastName, user.Role.ToString()));
    }
}
