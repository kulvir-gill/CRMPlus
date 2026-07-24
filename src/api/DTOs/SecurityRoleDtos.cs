namespace CRMPlus.Api.DTOs;

public record SecurityRoleRef(Guid Id, string Name);

public record SecurityRoleRequest(string Name, string? Description, List<string>? Modules, string? AccessLevel);

public record SecurityRoleResponse(Guid Id, string Name, string? Description, List<string> Modules, string AccessLevel, DateTime CreatedAt);
