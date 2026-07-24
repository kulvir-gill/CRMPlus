namespace CRMPlus.Api.DTOs;

public record QuoteSettingsRequest(int DefaultValidityDays, string? DocumentLocation);

public record QuoteSettingsResponse(Guid Id, int DefaultValidityDays, string? DocumentLocation);
