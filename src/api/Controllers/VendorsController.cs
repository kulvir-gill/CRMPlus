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
[Authorize(Policy = "Module:inventory")]
public class VendorsController(AppDbContext db, CurrentUserService currentUser, OwnershipService ownership) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search, [FromQuery] bool? isActive,
        [FromQuery] string sortField = "name", [FromQuery] string sortDir = "asc",
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 1000);

        var query = db.Vendors.Include(v => v.Owner).Include(v => v.OwnerTeam).AsQueryable();

        if (currentUser.GetAccessLevel(AppModules.Inventory) == ModuleAccessLevel.UserLevel)
        {
            var visibleOwnerIds = await ownership.GetVisibleOwnerIdsAsync(currentUser.UserId);
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            query = query.Where(v =>
                (v.OwnerId != null && visibleOwnerIds.Contains(v.OwnerId.Value)) ||
                (v.OwnerTeamId != null && userTeamIds.Contains(v.OwnerTeamId.Value)));
        }

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(v => v.Name.Contains(search) || (v.Email != null && v.Email.Contains(search)) || (v.ContactName != null && v.ContactName.Contains(search)));
        if (isActive.HasValue)
            query = query.Where(v => v.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();
        query = ApplySort(query, sortField, sortDir);

        var vendors = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new VendorListResponse(vendors.Select(ToResponse).ToList(), totalCount));
    }

    private static IQueryable<Vendor> ApplySort(IQueryable<Vendor> query, string sortField, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortField.ToLowerInvariant() switch
        {
            "contactname" => desc ? query.OrderByDescending(v => v.ContactName) : query.OrderBy(v => v.ContactName),
            "email" => desc ? query.OrderByDescending(v => v.Email) : query.OrderBy(v => v.Email),
            "phone" => desc ? query.OrderByDescending(v => v.Phone) : query.OrderBy(v => v.Phone),
            "createdat" => desc ? query.OrderByDescending(v => v.CreatedAt) : query.OrderBy(v => v.CreatedAt),
            _ => desc ? query.OrderByDescending(v => v.Name) : query.OrderBy(v => v.Name),
        };
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var v = await db.Vendors.Include(v => v.Owner).Include(v => v.OwnerTeam).FirstOrDefaultAsync(v => v.Id == id);
        if (v is null) return NotFound();
        if (currentUser.GetAccessLevel(AppModules.Inventory) == ModuleAccessLevel.UserLevel &&
            !await ownership.IsVisibleAsync(currentUser.UserId, v.OwnerId, v.OwnerTeamId))
            return NotFound();
        return Ok(ToResponse(v));
    }

    [HttpPost]
    public async Task<IActionResult> Create(VendorRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Inventory);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "A vendor can be owned by a user or a team, not both." });

        Guid? ownerId = req.OwnerId, ownerTeamId = req.OwnerTeamId;
        if (level == ModuleAccessLevel.UserLevel)
            (ownerId, ownerTeamId) = await ownership.ResolveUserLevelOwnershipAsync(currentUser.UserId, req.OwnerId, req.OwnerTeamId);
        else if (ownerId is null && ownerTeamId is null)
            ownerId = currentUser.UserId;

        var vendor = new Vendor
        {
            Name = req.Name, ContactName = req.ContactName, Email = req.Email, Phone = req.Phone, Address = req.Address,
            AuditEnabled = req.AuditEnabled, IsActive = req.IsActive,
            OwnerId = ownerId, OwnerTeamId = ownerTeamId,
        };
        db.Vendors.Add(vendor);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = vendor.Id }, ToResponse(vendor));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, VendorRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Inventory);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "A vendor can be owned by a user or a team, not both." });

        var vendor = await db.Vendors.FindAsync(id);
        if (vendor is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, vendor.OwnerId, vendor.OwnerTeamId)) return Forbid();

        vendor.Name = req.Name; vendor.ContactName = req.ContactName; vendor.Email = req.Email;
        vendor.Phone = req.Phone; vendor.Address = req.Address; vendor.AuditEnabled = req.AuditEnabled;
        vendor.IsActive = req.IsActive; vendor.OwnerId = req.OwnerId; vendor.OwnerTeamId = req.OwnerTeamId;
        vendor.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("bulk-status")]
    public async Task<IActionResult> BulkSetStatus(BulkStatusRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Inventory);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        if (req.Ids is null || req.Ids.Count == 0)
            return BadRequest(new { message = "No vendors selected." });

        var idQuery = db.Vendors.Where(v => req.Ids.Contains(v.Id));
        if (level == ModuleAccessLevel.UserLevel)
        {
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            idQuery = idQuery.Where(v =>
                v.OwnerId == currentUser.UserId ||
                (v.OwnerTeamId != null && userTeamIds.Contains(v.OwnerTeamId.Value)));
        }
        var vendors = await idQuery.ToListAsync();
        foreach (var vendor in vendors)
        {
            vendor.IsActive = req.IsActive;
            vendor.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return Ok(new { updated = vendors.Count });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Inventory);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var vendor = await db.Vendors.FindAsync(id);
        if (vendor is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, vendor.OwnerId, vendor.OwnerTeamId)) return Forbid();

        db.Vendors.Remove(vendor);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static VendorResponse ToResponse(Vendor v) => new(
        v.Id, v.Name, v.ContactName, v.Email, v.Phone, v.Address, v.AuditEnabled, v.IsActive, v.CreatedAt,
        v.OwnerId, v.Owner is not null ? $"{v.Owner.FirstName} {v.Owner.LastName}" : null,
        v.OwnerTeamId, v.OwnerTeam?.Name);
}
