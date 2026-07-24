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
public class QuoteTemplatesController(AppDbContext db, CurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? accountId)
    {
        var query = db.QuoteTemplates.AsQueryable();
        if (accountId.HasValue) query = query.Where(t => t.AccountId == accountId);

        var templates = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
        return Ok(templates.Select(t => new QuoteTemplateSummaryResponse(t.Id, t.Name, t.CreatedAt)).ToList());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var t = await db.QuoteTemplates.Include(t => t.LineItems).ThenInclude(li => li.Product)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (t is null) return NotFound();
        return Ok(ToResponse(t));
    }

    [HttpPost]
    public async Task<IActionResult> Create(QuoteTemplateRequest req)
    {
        if (currentUser.GetAccessLevel(AppModules.Sales) == ModuleAccessLevel.ReadOnly) return Forbid();
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Template name is required." });

        var template = new QuoteTemplate
        {
            Name = req.Name.Trim(), AccountId = req.AccountId, Notes = req.Notes,
            TaxRate = req.TaxRate, Discount = req.Discount,
            LineItems = req.LineItems.Select(li => new QuoteTemplateLineItem
            {
                ProductId = li.ProductId, Description = li.Description,
                Quantity = li.Quantity, UnitPrice = li.UnitPrice, Discount = li.Discount
            }).ToList()
        };
        db.QuoteTemplates.Add(template);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = template.Id }, new { template.Id, template.Name });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (currentUser.GetAccessLevel(AppModules.Sales) == ModuleAccessLevel.ReadOnly) return Forbid();

        var template = await db.QuoteTemplates.FindAsync(id);
        if (template is null) return NotFound();
        db.QuoteTemplates.Remove(template);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static QuoteTemplateResponse ToResponse(QuoteTemplate t) => new(
        t.Id, t.Name, t.AccountId, t.Notes, t.TaxRate, t.Discount, t.CreatedAt,
        t.LineItems.Select(li => new QuoteTemplateLineItemResponse(li.Id, li.ProductId, li.Product?.ProductNumber, li.Product?.Name,
            li.Description, li.Quantity, li.UnitPrice, li.Discount)).ToList());
}
