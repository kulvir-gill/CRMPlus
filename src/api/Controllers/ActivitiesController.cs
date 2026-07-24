using CRMPlus.Api.Data;
using CRMPlus.Api.DTOs;
using CRMPlus.Api.Models;
using CRMPlus.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CRMPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Authorize(Policy = "Module:crm")]
public class ActivitiesController(AppDbContext db, CurrentUserService currentUser, OwnershipService ownership) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? accountId, [FromQuery] Guid? contactId)
    {
        var query = db.Activities
            .Include(a => a.Account)
            .Include(a => a.Contact)
            .Include(a => a.User)
            .AsQueryable();

        if (currentUser.GetAccessLevel(AppModules.Crm) == ModuleAccessLevel.UserLevel)
        {
            var visibleOwnerIds = await ownership.GetVisibleOwnerIdsAsync(currentUser.UserId);
            query = query.Where(a => visibleOwnerIds.Contains(a.UserId));
        }

        if (accountId.HasValue) query = query.Where(a => a.AccountId == accountId);
        if (contactId.HasValue) query = query.Where(a => a.ContactId == contactId);

        var activities = await query.OrderByDescending(a => a.CreatedAt)
            .Select(a => new ActivityResponse(
                a.Id, a.Type.ToString(), a.Subject, a.Body, a.Direction != null ? a.Direction.ToString() : null,
                a.AccountId, a.Account != null ? a.Account.Name : null,
                a.ContactId, a.Contact != null ? a.Contact.FirstName + " " + a.Contact.LastName : null,
                a.UserId, a.User!.FirstName + " " + a.User.LastName,
                a.CreatedAt))
            .ToListAsync();

        return Ok(activities);
    }

    [HttpPost]
    public async Task<IActionResult> Create(ActivityRequest req)
    {
        if (currentUser.GetAccessLevel(AppModules.Crm) == ModuleAccessLevel.ReadOnly) return Forbid();

        var activity = new Activity
        {
            Type = req.Type, Subject = req.Subject, Body = req.Body, Direction = req.Direction,
            AccountId = req.AccountId, ContactId = req.ContactId, UserId = currentUser.UserId,
        };
        db.Activities.Add(activity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = activity.Id }, new { activity.Id });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Crm);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var activity = await db.Activities.FindAsync(id);
        if (activity is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && activity.UserId != currentUser.UserId) return Forbid();

        db.Activities.Remove(activity);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
