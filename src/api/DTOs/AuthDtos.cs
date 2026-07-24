namespace CRMPlus.Api.DTOs;

public record LoginRequest(string Email, string Password);

public record RegisterRequest(string FirstName, string LastName, string Email, string Password, List<Guid>? SecurityRoleIds = null, List<Guid>? TeamIds = null);

public record AuthResponse(string Token, Guid UserId, string Email, string FirstName, string LastName, List<string> Roles, List<string> Modules, List<string> ModuleAccess);
