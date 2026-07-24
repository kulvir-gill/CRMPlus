namespace CRMPlus.Api.DTOs;

public record BulkStatusRequest(List<Guid> Ids, bool IsActive);
