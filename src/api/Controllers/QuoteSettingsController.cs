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
[Authorize(Policy = "Module:setting")]
public class QuoteSettingsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var settings = await GetOrCreateAsync();
        return Ok(ToResponse(settings));
    }

    [HttpPut]
    public async Task<IActionResult> Update(QuoteSettingsRequest req)
    {
        if (req.DefaultValidityDays < 0)
            return BadRequest(new { message = "Default validity days must be zero or greater." });

        var settings = await GetOrCreateAsync();
        settings.DefaultValidityDays = req.DefaultValidityDays;
        settings.DocumentLocation = string.IsNullOrWhiteSpace(req.DocumentLocation) ? null : req.DocumentLocation.Trim();
        await db.SaveChangesAsync();
        return Ok(ToResponse(settings));
    }

    private async Task<QuoteSettings> GetOrCreateAsync()
    {
        var settings = await db.QuoteSettings.FirstOrDefaultAsync();
        if (settings is null)
        {
            settings = new QuoteSettings();
            db.QuoteSettings.Add(settings);
            await db.SaveChangesAsync();
        }
        return settings;
    }

    private static QuoteSettingsResponse ToResponse(QuoteSettings s) => new(s.Id, s.DefaultValidityDays, s.DocumentLocation);
}
