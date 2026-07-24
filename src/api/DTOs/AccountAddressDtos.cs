namespace CRMPlus.Api.DTOs;

public record AccountAddressRequest(
    List<string>? AddressType,
    string? AddressLine1,
    string? AddressLine2,
    string? AddressLine3,
    string? County,
    string? Province,
    string? Country,
    string? PostalCode);

public record AccountAddressDto(
    Guid Id,
    List<string> AddressType,
    string? AddressLine1,
    string? AddressLine2,
    string? AddressLine3,
    string? County,
    string? Province,
    string? Country,
    string? PostalCode);
