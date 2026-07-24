namespace CRMPlus.Api.DTOs;

public record AddressDto(
    string? AddressLine1,
    string? AddressLine2,
    string? AddressLine3,
    string? County,
    string? Province,
    string? Country,
    string? PostalCode);
