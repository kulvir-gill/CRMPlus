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
[Authorize(Policy = "Module:sales")]
public class InvoicesController(AppDbContext db, CurrentUserService currentUser, OwnershipService ownership) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? accountId)
    {
        var query = db.Invoices
            .Include(i => i.Account).Include(i => i.Contact).Include(i => i.Owner).Include(i => i.OwnerTeam).Include(i => i.Order)
            .Include(i => i.LineItems).ThenInclude(li => li.Product)
            .AsQueryable();

        if (currentUser.GetAccessLevel(AppModules.Sales) == ModuleAccessLevel.UserLevel)
        {
            var visibleOwnerIds = await ownership.GetVisibleOwnerIdsAsync(currentUser.UserId);
            var userTeamIds = await ownership.GetUserTeamIdsAsync(currentUser.UserId);
            query = query.Where(i =>
                (i.OwnerId != null && visibleOwnerIds.Contains(i.OwnerId.Value)) ||
                (i.OwnerTeamId != null && userTeamIds.Contains(i.OwnerTeamId.Value)));
        }

        if (accountId.HasValue) query = query.Where(i => i.AccountId == accountId);

        return Ok(await query.OrderByDescending(i => i.CreatedAt).Select(i => ToResponse(i)).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var i = await db.Invoices.Include(i => i.Account).Include(i => i.Contact).Include(i => i.Owner).Include(i => i.OwnerTeam).Include(i => i.Order)
            .Include(i => i.LineItems).ThenInclude(li => li.Product)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (i is null) return NotFound();
        if (currentUser.GetAccessLevel(AppModules.Sales) == ModuleAccessLevel.UserLevel &&
            !await ownership.IsVisibleAsync(currentUser.UserId, i.OwnerId, i.OwnerTeamId))
            return NotFound();
        return Ok(ToResponse(i));
    }

    [HttpPost]
    public async Task<IActionResult> Create(InvoiceRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "An invoice can be owned by a user or a team, not both." });

        Guid? ownerId = req.OwnerId, ownerTeamId = req.OwnerTeamId;
        if (level == ModuleAccessLevel.UserLevel)
            (ownerId, ownerTeamId) = await ownership.ResolveUserLevelOwnershipAsync(currentUser.UserId, req.OwnerId, req.OwnerTeamId);
        else if (ownerId is null && ownerTeamId is null)
            ownerId = currentUser.UserId;

        var count = await db.Invoices.CountAsync() + 1;
        var invoice = new Invoice
        {
            InvoiceNumber = $"INV-{count:D5}",
            AccountId = req.AccountId, ContactId = req.ContactId, QuoteId = req.QuoteId, OrderId = req.OrderId,
            Status = req.Status, DueDate = req.DueDate, Notes = req.Notes, TaxRate = req.TaxRate,
            OwnerId = ownerId, OwnerTeamId = ownerTeamId,
            LineItems = req.LineItems.Select(li => new InvoiceLineItem
            {
                ProductId = li.ProductId, Description = li.Description,
                Quantity = li.Quantity, UnitPrice = li.UnitPrice, Total = li.Quantity * li.UnitPrice
            }).ToList()
        };
        RecalcTotals(invoice);
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = invoice.Id }, new { invoice.Id, invoice.InvoiceNumber });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, InvoiceRequest req)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();
        if (req.OwnerId.HasValue && req.OwnerTeamId.HasValue)
            return BadRequest(new { message = "An invoice can be owned by a user or a team, not both." });

        var invoice = await db.Invoices.Include(i => i.LineItems).FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, invoice.OwnerId, invoice.OwnerTeamId)) return Forbid();

        invoice.AccountId = req.AccountId; invoice.ContactId = req.ContactId; invoice.QuoteId = req.QuoteId; invoice.OrderId = req.OrderId;
        invoice.Status = req.Status; invoice.DueDate = req.DueDate; invoice.Notes = req.Notes;
        invoice.TaxRate = req.TaxRate; invoice.OwnerId = req.OwnerId; invoice.OwnerTeamId = req.OwnerTeamId; invoice.UpdatedAt = DateTime.UtcNow;
        invoice.LineItems = req.LineItems.Select(li => new InvoiceLineItem
        {
            InvoiceId = id, ProductId = li.ProductId, Description = li.Description,
            Quantity = li.Quantity, UnitPrice = li.UnitPrice, Total = li.Quantity * li.UnitPrice
        }).ToList();
        RecalcTotals(invoice);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var level = currentUser.GetAccessLevel(AppModules.Sales);
        if (level == ModuleAccessLevel.ReadOnly) return Forbid();

        var invoice = await db.Invoices.FindAsync(id);
        if (invoice is null) return NotFound();
        if (level == ModuleAccessLevel.UserLevel && !await ownership.OwnsAsync(currentUser.UserId, invoice.OwnerId, invoice.OwnerTeamId)) return Forbid();

        db.Invoices.Remove(invoice);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static void RecalcTotals(Invoice i)
    {
        i.Subtotal = i.LineItems.Sum(li => li.Total);
        i.Tax = i.Subtotal * i.TaxRate / 100;
        i.Total = i.Subtotal + i.Tax;
    }

    private static InvoiceResponse ToResponse(Invoice i) => new(
        i.Id, i.InvoiceNumber, i.AccountId, i.Account!.Name,
        i.ContactId, i.Contact != null ? i.Contact.FirstName + " " + i.Contact.LastName : null,
        i.QuoteId, i.OrderId, i.Order?.OrderNumber, i.Status.ToString(), i.DueDate, i.Notes, i.TaxRate, i.Subtotal, i.Tax, i.Total, i.CreatedAt,
        i.LineItems.Select(li => new InvoiceLineItemResponse(li.Id, li.ProductId, li.Product?.ProductNumber, li.Product?.Name,
            li.Description, li.Quantity, li.UnitPrice, li.Total)).ToList(),
        i.OwnerId, i.Owner is not null ? $"{i.Owner.FirstName} {i.Owner.LastName}" : null,
        i.OwnerTeamId, i.OwnerTeam?.Name);
}
