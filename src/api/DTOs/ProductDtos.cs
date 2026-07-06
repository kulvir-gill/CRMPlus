namespace CRMPlus.Api.DTOs;

public record ProductRequest(string Name, string? Description, decimal Price, string Unit = "each", bool IsActive = true);

public record ProductResponse(int Id, string Name, string? Description, decimal Price, string Unit, bool IsActive, DateTime CreatedAt);
