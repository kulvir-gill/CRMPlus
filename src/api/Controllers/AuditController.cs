using CRMPlus.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRMPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Manager")]
public class AuditController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetLogs([FromQuery] string? entity, [FromQuery] int? entityId)
    {
        var query = db.AuditLogs.AsQueryable();
        if (!string.IsNullOrWhiteSpace(entity)) query = query.Where(l => l.EntityName == entity);
        if (entityId.HasValue) query = query.Where(l => l.EntityId == entityId);

        var logs = await query.OrderByDescending(l => l.Timestamp)
            .Take(500)
            .Select(l => new
            {
                l.Id, l.EntityName, l.EntityId, Action = l.Action.ToString(),
                l.UserId, l.UserEmail, l.OldValues, l.NewValues, l.Timestamp
            })
            .ToListAsync();

        return Ok(logs);
    }
}
