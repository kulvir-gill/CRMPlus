using System.Security.Claims;
using CRMPlus.Api.Models;
using Microsoft.AspNetCore.Http;

namespace CRMPlus.Api.Services;

public class CurrentUserService(IHttpContextAccessor http)
{
    private ClaimsPrincipal User => http.HttpContext!.User;

    public Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    public string? Email => User.FindFirstValue(ClaimTypes.Email);

    public ModuleAccessLevel GetAccessLevel(string module)
    {
        if (User.IsInRole("Admin")) return ModuleAccessLevel.Full;

        var level = ModuleAccessLevel.ReadOnly;
        var found = false;
        foreach (var claim in User.FindAll(TokenService.ModuleAccessClaimType))
        {
            var parts = claim.Value.Split(':', 2);
            if (parts.Length != 2 || parts[0] != module) continue;
            if (!Enum.TryParse<ModuleAccessLevel>(parts[1], out var parsed)) continue;
            if (!found || parsed > level) level = parsed;
            found = true;
        }
        return found ? level : ModuleAccessLevel.ReadOnly;
    }
}
