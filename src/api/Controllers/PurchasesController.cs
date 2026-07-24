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
public class PurchasesController(AppDbContext db, CurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? productId)
    {
        var query = db.Purchases.Include(p => p.Vendor).Include(p => p.Owner).Include(p => p.OwnerTeam).AsQueryable();
        if (productId.HasValue) query = query.Where(p => p.ProductId == productId);

        var purchases = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
        return Ok(purchases.Select(ToResponse).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> Create(PurchaseRequest req)
    {
        if (currentUser.GetAccessLevel(AppModules.Inventory) == ModuleAccessLevel.ReadOnly) return Forbid();
        if (!Enum.TryParse<PurchaseStatus>(req.Status, true, out var status))
            return BadRequest(new { message = "Invalid purchase status." });

        var product = await db.Products.FindAsync(req.ProductId);
        if (product is null) return BadRequest(new { message = "Product not found." });

        var purchase = new Purchase
        {
            ProductId = req.ProductId, VendorId = req.VendorId, Currency = req.Currency,
            UnitOfMeasure = req.UnitOfMeasure, Quantity = req.Quantity, Price = req.Price, Status = status,
            AuditEnabled = req.AuditEnabled, OwnerId = req.OwnerId ?? currentUser.UserId, OwnerTeamId = req.OwnerTeamId,
        };
        db.Purchases.Add(purchase);
        await db.SaveChangesAsync();
        await db.Entry(purchase).Reference(p => p.Vendor).LoadAsync();
        return Ok(ToResponse(purchase));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, PurchaseRequest req)
    {
        if (currentUser.GetAccessLevel(AppModules.Inventory) == ModuleAccessLevel.ReadOnly) return Forbid();
        if (!Enum.TryParse<PurchaseStatus>(req.Status, true, out var status))
            return BadRequest(new { message = "Invalid purchase status." });

        var purchase = await db.Purchases.Include(p => p.Vendor).FirstOrDefaultAsync(p => p.Id == id);
        if (purchase is null) return NotFound();

        purchase.VendorId = req.VendorId; purchase.Currency = req.Currency; purchase.UnitOfMeasure = req.UnitOfMeasure;
        purchase.Quantity = req.Quantity; purchase.Price = req.Price; purchase.Status = status; purchase.AuditEnabled = req.AuditEnabled;
        purchase.OwnerId = req.OwnerId; purchase.OwnerTeamId = req.OwnerTeamId; purchase.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await db.Entry(purchase).Reference(p => p.Vendor).LoadAsync();
        return Ok(ToResponse(purchase));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (currentUser.GetAccessLevel(AppModules.Inventory) == ModuleAccessLevel.ReadOnly) return Forbid();

        var purchase = await db.Purchases.FindAsync(id);
        if (purchase is null) return NotFound();

        db.Purchases.Remove(purchase);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static PurchaseResponse ToResponse(Purchase p) => new(
        p.Id, p.ProductId, p.VendorId, p.Vendor?.Name, p.Currency, p.UnitOfMeasure, p.Quantity, p.Price, p.Status.ToString(), p.CreatedAt,
        p.OwnerId, p.Owner is not null ? $"{p.Owner.FirstName} {p.Owner.LastName}" : null,
        p.OwnerTeamId, p.OwnerTeam?.Name);
}
