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
public class ProductsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool activeOnly = true)
    {
        var query = db.Products.AsQueryable();
        if (activeOnly) query = query.Where(p => p.IsActive);

        var products = await query.OrderBy(p => p.Name)
            .Select(p => new ProductResponse(p.Id, p.Name, p.Description, p.Price, p.Unit, p.IsActive, p.CreatedAt))
            .ToListAsync();
        return Ok(products);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var p = await db.Products.FindAsync(id);
        if (p is null) return NotFound();
        return Ok(new ProductResponse(p.Id, p.Name, p.Description, p.Price, p.Unit, p.IsActive, p.CreatedAt));
    }

    [HttpPost]
    public async Task<IActionResult> Create(ProductRequest req)
    {
        var product = new Product
        {
            Name = req.Name, Description = req.Description, Price = req.Price,
            Unit = req.Unit, IsActive = req.IsActive
        };
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = product.Id },
            new ProductResponse(product.Id, product.Name, product.Description, product.Price, product.Unit, product.IsActive, product.CreatedAt));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, ProductRequest req)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();
        product.Name = req.Name; product.Description = req.Description; product.Price = req.Price;
        product.Unit = req.Unit; product.IsActive = req.IsActive; product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();
        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
