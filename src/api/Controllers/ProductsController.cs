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
public class ProductsController(AppDbContext db, CurrentUserService currentUser, OwnershipService ownership) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search, [FromQuery] bool? isActive,
        [FromQuery] string sortField = "name", [FromQuery] string sortDir = "asc",
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 1000);

        var query = db.Products.Include(p => p.Owner).Include(p => p.OwnerTeam).Include(p => p.Vendor).AsQueryable();

        if (currentUser.GetAccessLevel(AppModules.Inventory) == ModuleAccessLevel.UserLevel)
        {
            var visibleOwnerIds = await ownership.GetVisibleOwnerIdsAsync(currentUser.UserId);
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            query = query.Where(p =>
                (p.OwnerId != null && visibleOwnerIds.Contains(p.OwnerId.Value)) ||
                (p.OwnerTeamId != null && userTeamIds.Contains(p.OwnerTeamId.Value)));
        }

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search) || (p.Description != null && p.Description.Contains(search)));
        if (isActive.HasValue)
            query = query.Where(p => p.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();
        query = ApplySort(query, sortField, sortDir);

        var products = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new ProductListResponse(products.Select(ToResponse).ToList(), totalCount));
    }

    private static IQueryable<Product> ApplySort(IQueryable<Product> query, string sortField, string sortDir)
    {
        var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        return sortField.ToLowerInvariant() switch
        {
            "productnumber" => desc ? query.OrderByDescending(p => p.ProductNumber) : query.OrderBy(p => p.ProductNumber),
            "price" => desc ? query.OrderByDescending(p => p.Price) : query.OrderBy(p => p.Price),
            "unit" => desc ? query.OrderByDescending(p => p.Unit) : query.OrderBy(p => p.Unit),
            "createdat" => desc ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt),
            _ => desc ? query.OrderByDescending(p => p.Name) : query.OrderBy(p => p.Name),
        };
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var p = await db.Products.Include(p => p.Owner).Include(p => p.OwnerTeam).Include(p => p.Vendor).FirstOrDefaultAsync(p => p.Id == id);
        if (p is null) return NotFound();
        if (currentUser.GetAccessLevel(AppModules.Inventory) == ModuleAccessLevel.UserLevel &&
            !await ownership.IsVisibleAsync(currentUser.UserId, p.OwnerId, p.OwnerTeamId))
            return NotFound();
        return Ok(ToResponse(p));
    }

    [HttpPost]
    public async Task<IActionResult> Create(ProductRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Inventory);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "A product can be owned by a user or a team, not both." });

        Guid? ownerId = req.OwnerId, ownerTeamId = req.OwnerTeamId;
        if (level == ModuleAccessLevel.UserLevel)
            (ownerId, ownerTeamId) = await ownership.ResolveUserLevelOwnershipAsync(currentUser.UserId, req.OwnerId, req.OwnerTeamId);
        else if (ownerId is null && ownerTeamId is null)
            ownerId = currentUser.UserId;

        var product = new Product
        {
            ProductNumber = await GenerateProductNumberAsync(),
            Name = req.Name, Description = req.Description, Price = req.Price,
            Unit = req.Unit, VendorId = req.VendorId, AuditEnabled = req.AuditEnabled, IsActive = req.IsActive,
            OwnerId = ownerId, OwnerTeamId = ownerTeamId,
        };
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, ToResponse(product));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, ProductRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Inventory);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "A product can be owned by a user or a team, not both." });

        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, product.OwnerId, product.OwnerTeamId)) return Forbid();

        product.Name = req.Name; product.Description = req.Description; product.Price = req.Price;
        product.Unit = req.Unit; product.VendorId = req.VendorId; product.AuditEnabled = req.AuditEnabled; product.IsActive = req.IsActive;
        product.OwnerId = req.OwnerId; product.OwnerTeamId = req.OwnerTeamId; product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("bulk-status")]
    public async Task<IActionResult> BulkSetStatus(BulkStatusRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Inventory);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        if (req.Ids is null || req.Ids.Count == 0)
            return BadRequest(new { message = "No products selected." });

        var idQuery = db.Products.Where(p => req.Ids.Contains(p.Id));
        if (level == ModuleAccessLevel.UserLevel)
        {
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            idQuery = idQuery.Where(p =>
                p.OwnerId == currentUser.UserId ||
                (p.OwnerTeamId != null && userTeamIds.Contains(p.OwnerTeamId.Value)));
        }
        var products = await idQuery.ToListAsync();
        foreach (var product in products)
        {
            product.IsActive = req.IsActive;
            product.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return Ok(new { updated = products.Count });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Inventory);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, product.OwnerId, product.OwnerTeamId)) return Forbid();

        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string> GenerateProductNumberAsync()
    {
        var numbers = await db.Products.Select(p => p.ProductNumber).ToListAsync();
        var max = numbers
            .Select(n => n.StartsWith("PR-") && int.TryParse(n.AsSpan(3), out var v) ? v : 0)
            .DefaultIfEmpty(0).Max();
        return $"PR-{max + 1:D5}";
    }

    private static ProductResponse ToResponse(Product p) => new(
        p.Id, p.ProductNumber, p.Name, p.Description, p.Price, p.Unit, p.VendorId, p.Vendor?.Name, p.AuditEnabled, p.IsActive, p.CreatedAt,
        p.OwnerId, p.Owner is not null ? $"{p.Owner.FirstName} {p.Owner.LastName}" : null,
        p.OwnerTeamId, p.OwnerTeam?.Name);
}
