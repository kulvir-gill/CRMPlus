namespace CRMPlus.Api.DTOs;

public record ProductRequest(string Name, string? Description, decimal Price, string Unit = "each", Guid? VendorId = null, bool AuditEnabled = false, bool IsActive = true, Guid? OwnerId = null, Guid? OwnerTeamId = null);

public record ProductListResponse(List<ProductResponse> Items, int TotalCount);

public record ProductResponse(Guid Id, string ProductNumber, string Name, string? Description, decimal Price, string Unit, Guid? VendorId, string? VendorName, bool AuditEnabled, bool IsActive, DateTime CreatedAt, Guid? OwnerId, string? OwnerName, Guid? OwnerTeamId, string? OwnerTeamName);
