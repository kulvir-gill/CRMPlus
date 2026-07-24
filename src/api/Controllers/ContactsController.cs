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
public class ContactsController(AppDbContext db, CurrentUserService currentUser, OwnershipService ownership) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search, [FromQuery] Guid? accountId, [FromQuery] bool? isActive,
        [FromQuery] string sortField = "name", [FromQuery] string sortDir = "asc",
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 1000);

        var query = db.Contacts.Include(c => c.Account).Include(c => c.Owner).Include(c => c.OwnerTeam).AsQueryable();

        if (currentUser.GetAccessLevel(AppModules.Crm) == ModuleAccessLevel.UserLevel)
        {
            var visibleOwnerIds = await ownership.GetVisibleOwnerIdsAsync(currentUser.UserId);
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            query = query.Where(c =>
                (c.OwnerId != null && visibleOwnerIds.Contains(c.OwnerId.Value)) ||
                (c.OwnerTeamId != null && userTeamIds.Contains(c.OwnerTeamId.Value)));
        }

        if (accountId.HasValue) query = query.Where(c => c.AccountId == accountId);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c => c.FirstName.Contains(search) || c.LastName.Contains(search) || (c.Email != null && c.Email.Contains(search)));
        if (isActive.HasValue)
            query = query.Where(c => c.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();
        query = ApplySort(query, sortField, sortDir);

        var contacts = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new ContactListResponse(contacts.Select(ToResponse).ToList(), totalCount));
    }

    private static IQueryable<Contact> ApplySort(IQueryable<Contact> query, string sortField, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortField.ToLowerInvariant() switch
        {
            "email" => desc ? query.OrderByDescending(c => c.Email) : query.OrderBy(c => c.Email),
            "phone" => desc ? query.OrderByDescending(c => c.Phone) : query.OrderBy(c => c.Phone),
            "title" => desc ? query.OrderByDescending(c => c.Title) : query.OrderBy(c => c.Title),
            "account" => desc ? query.OrderByDescending(c => c.Account!.Name) : query.OrderBy(c => c.Account!.Name),
            "isactive" => desc ? query.OrderByDescending(c => c.IsActive) : query.OrderBy(c => c.IsActive),
            "createdat" => desc ? query.OrderByDescending(c => c.CreatedAt) : query.OrderBy(c => c.CreatedAt),
            _ => desc
                ? query.OrderByDescending(c => c.LastName).ThenByDescending(c => c.FirstName)
                : query.OrderBy(c => c.LastName).ThenBy(c => c.FirstName),
        };
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var c = await db.Contacts.Include(c => c.Account).Include(c => c.Owner).Include(c => c.OwnerTeam).FirstOrDefaultAsync(c => c.Id == id);
        if (c is null) return NotFound();
        if (currentUser.GetAccessLevel(AppModules.Crm) == ModuleAccessLevel.UserLevel &&
            !await ownership.IsVisibleAsync(currentUser.UserId, c.OwnerId, c.OwnerTeamId))
            return NotFound();
        return Ok(ToResponse(c));
    }

    [HttpPost]
    public async Task<IActionResult> Create(ContactRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Crm);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "A contact can be owned by a user or a team, not both." });

        if (await HasDuplicateAsync(req.AccountId, req.FirstName, req.LastName, req.Email, null))
            return BadRequest(new { message = "A contact with this name or email already exists for this account." });

        Guid? ownerId = req.OwnerId, ownerTeamId = req.OwnerTeamId;
        if (level == ModuleAccessLevel.UserLevel)
            (ownerId, ownerTeamId) = await ownership.ResolveUserLevelOwnershipAsync(currentUser.UserId, req.OwnerId, req.OwnerTeamId);
        else if (ownerId is null && ownerTeamId is null)
            ownerId = currentUser.UserId;

        var contact = new Contact
        {
            FirstName = req.FirstName, LastName = req.LastName, Email = req.Email,
            Phone = req.Phone, Title = req.Title, AccountId = req.AccountId, AuditEnabled = req.AuditEnabled,
            OwnerId = ownerId, OwnerTeamId = ownerTeamId, IsActive = req.IsActive,
        };
        db.Contacts.Add(contact);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = contact.Id }, ToResponse(contact));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, ContactRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Crm);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "A contact can be owned by a user or a team, not both." });

        if (await HasDuplicateAsync(req.AccountId, req.FirstName, req.LastName, req.Email, id))
            return BadRequest(new { message = "A contact with this name or email already exists for this account." });

        var contact = await db.Contacts.FindAsync(id);
        if (contact is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, contact.OwnerId, contact.OwnerTeamId)) return Forbid();

        contact.FirstName = req.FirstName; contact.LastName = req.LastName; contact.Email = req.Email;
        contact.Phone = req.Phone; contact.Title = req.Title; contact.AccountId = req.AccountId;
        contact.AuditEnabled = req.AuditEnabled; contact.OwnerId = req.OwnerId; contact.OwnerTeamId = req.OwnerTeamId;
        contact.IsActive = req.IsActive; contact.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("bulk-status")]
    public async Task<IActionResult> BulkSetStatus(BulkStatusRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Crm);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        if (req.Ids is null || req.Ids.Count == 0)
            return BadRequest(new { message = "No contacts selected." });

        var idQuery = db.Contacts.Where(c => req.Ids.Contains(c.Id));
        if (level == ModuleAccessLevel.UserLevel)
        {
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            idQuery = idQuery.Where(c =>
                c.OwnerId == currentUser.UserId ||
                (c.OwnerTeamId != null && userTeamIds.Contains(c.OwnerTeamId.Value)));
        }
        var contacts = await idQuery.ToListAsync();
        foreach (var contact in contacts)
        {
            contact.IsActive = req.IsActive;
            contact.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return Ok(new { updated = contacts.Count });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Crm);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var contact = await db.Contacts.FindAsync(id);
        if (contact is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, contact.OwnerId, contact.OwnerTeamId)) return Forbid();

        db.Contacts.Remove(contact);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // "Duplicate" is scoped to the contact's account: same name (case-insensitive) or same email already exists there.
    private async Task<bool> HasDuplicateAsync(Guid? accountId, string firstName, string lastName, string? email, Guid? excludeId)
    {
        if (!accountId.HasValue) return false;

        var normalizedEmail = string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLower();
        return await db.Contacts.AnyAsync(c =>
            c.AccountId == accountId && c.Id != excludeId &&
            ((c.FirstName.ToLower() == firstName.Trim().ToLower() && c.LastName.ToLower() == lastName.Trim().ToLower()) ||
             (normalizedEmail != null && c.Email != null && c.Email.ToLower() == normalizedEmail)));
    }

    private static ContactResponse ToResponse(Contact c) => new(
        c.Id, c.FirstName, c.LastName, c.Email, c.Phone, c.Title,
        c.AccountId, c.Account?.Name, c.AuditEnabled, c.CreatedAt,
        c.OwnerId, c.Owner is not null ? $"{c.Owner.FirstName} {c.Owner.LastName}" : null,
        c.OwnerTeamId, c.OwnerTeam?.Name, c.IsActive);
}
