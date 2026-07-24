using CRMPlus.Api.Data;
using CRMPlus.Api.DTOs;
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
    public async Task<IActionResult> GetLogs([FromQuery] string? entity, [FromQuery] Guid? entityId)
    {
        var query = db.AuditLogs.Include(l => l.Changes).AsQueryable();
        if (!string.IsNullOrWhiteSpace(entity)) query = query.Where(l => l.EntityName == entity);
        if (entityId.HasValue) query = query.Where(l => l.EntityId == entityId);

        var logs = await query
            .OrderByDescending(l => l.Timestamp)
            .Take(500)
            .Select(l => new AuditLogResponse(
                l.Id, l.EntityName, l.EntityId, l.Action.ToString(),
                l.UserId, l.UserEmail, l.Timestamp,
                l.Changes.Where(c => c.FieldName != "UpdatedAt")
                    .Select(c => new AuditLogChangeResponse(c.FieldName, c.OldValue, c.NewValue)).ToList()))
            .ToListAsync();

        return Ok(logs);
    }
}
