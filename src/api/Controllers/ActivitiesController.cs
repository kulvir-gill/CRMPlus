using System.Security.Claims;
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
public class ActivitiesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? accountId, [FromQuery] int? contactId)
    {
        var query = db.Activities
            .Include(a => a.Account)
            .Include(a => a.Contact)
            .Include(a => a.User)
            .AsQueryable();

        if (accountId.HasValue) query = query.Where(a => a.AccountId == accountId);
        if (contactId.HasValue) query = query.Where(a => a.ContactId == contactId);

        var activities = await query.OrderByDescending(a => a.CreatedAt)
            .Select(a => new ActivityResponse(
                a.Id, a.Type.ToString(), a.Subject, a.Body,
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
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var activity = new Activity
        {
            Type = req.Type, Subject = req.Subject, Body = req.Body,
            AccountId = req.AccountId, ContactId = req.ContactId, UserId = userId,
        };
        db.Activities.Add(activity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = activity.Id }, new { activity.Id });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var activity = await db.Activities.FindAsync(id);
        if (activity is null) return NotFound();
        db.Activities.Remove(activity);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
