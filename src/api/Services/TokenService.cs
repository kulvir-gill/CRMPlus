using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CRMPlus.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace CRMPlus.Api.Services;

public class TokenService(IConfiguration config)
{
    public const string ModuleClaimType = "module";
    public const string ModuleAccessClaimType = "moduleAccess";

    private static IEnumerable<SecurityRole> EffectiveRoles(User user) =>
        user.SecurityRoles.Concat(user.Teams.SelectMany(t => t.SecurityRoles));

    public static List<string> EffectiveRoleNames(User user) =>
        EffectiveRoles(user).Select(r => r.Name).Distinct().ToList();

    public static List<string> EffectiveModuleKeys(User user)
    {
        var roles = EffectiveRoles(user).ToList();
        if (roles.Any(r => r.Name == "Admin")) return [.. AppModules.All];

        return roles
            .SelectMany(r => r.Modules.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Distinct()
            .ToList();
    }

    // Most permissive access level wins across a user's direct + team-inherited roles, per module.
    public static Dictionary<string, ModuleAccessLevel> EffectiveModuleAccess(User user)
    {
        var roles = EffectiveRoles(user).ToList();
        if (roles.Any(r => r.Name == "Admin"))
            return AppModules.All.ToDictionary(m => m, _ => ModuleAccessLevel.Full);

        var access = new Dictionary<string, ModuleAccessLevel>();
        foreach (var role in roles)
        {
            foreach (var module in role.Modules.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (!access.TryGetValue(module, out var existing) || role.AccessLevel > existing)
                    access[module] = role.AccessLevel;
            }
        }
        return access;
    }

    public static List<string> EffectiveModuleAccessStrings(User user) =>
        EffectiveModuleAccess(user).Select(kv => $"{kv.Key}:{kv.Value}").ToList();

    public string GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var roles = EffectiveRoleNames(user);
        var modules = EffectiveModuleKeys(user);
        var moduleAccess = EffectiveModuleAccessStrings(user);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("firstName", user.FirstName),
            new("lastName", user.LastName),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));
        claims.AddRange(modules.Select(m => new Claim(ModuleClaimType, m)));
        claims.AddRange(moduleAccess.Select(m => new Claim(ModuleAccessClaimType, m)));

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
