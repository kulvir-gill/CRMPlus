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
public class InvoicesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? accountId)
    {
        var query = db.Invoices
            .Include(i => i.Account).Include(i => i.Contact)
            .Include(i => i.LineItems).ThenInclude(li => li.Product)
            .AsQueryable();

        if (accountId.HasValue) query = query.Where(i => i.AccountId == accountId);

        return Ok(await query.OrderByDescending(i => i.CreatedAt).Select(i => ToResponse(i)).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var i = await db.Invoices.Include(i => i.Account).Include(i => i.Contact)
            .Include(i => i.LineItems).ThenInclude(li => li.Product)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (i is null) return NotFound();
        return Ok(ToResponse(i));
    }

    [HttpPost]
    public async Task<IActionResult> Create(InvoiceRequest req)
    {
        var count = await db.Invoices.CountAsync() + 1;
        var invoice = new Invoice
        {
            InvoiceNumber = $"INV-{count:D5}",
            AccountId = req.AccountId, ContactId = req.ContactId, QuoteId = req.QuoteId,
            Status = req.Status, DueDate = req.DueDate, Notes = req.Notes, TaxRate = req.TaxRate,
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
    public async Task<IActionResult> Update(int id, InvoiceRequest req)
    {
        var invoice = await db.Invoices.Include(i => i.LineItems).FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) return NotFound();

        invoice.AccountId = req.AccountId; invoice.ContactId = req.ContactId; invoice.QuoteId = req.QuoteId;
        invoice.Status = req.Status; invoice.DueDate = req.DueDate; invoice.Notes = req.Notes;
        invoice.TaxRate = req.TaxRate; invoice.UpdatedAt = DateTime.UtcNow;
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
    public async Task<IActionResult> Delete(int id)
    {
        var invoice = await db.Invoices.FindAsync(id);
        if (invoice is null) return NotFound();
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
        i.QuoteId, i.Status.ToString(), i.DueDate, i.Notes, i.TaxRate, i.Subtotal, i.Tax, i.Total, i.CreatedAt,
        i.LineItems.Select(li => new InvoiceLineItemResponse(li.Id, li.ProductId, li.Product?.Name,
            li.Description, li.Quantity, li.UnitPrice, li.Total)).ToList());
}
