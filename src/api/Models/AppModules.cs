namespace CRMPlus.Api.Models;

public static class AppModules
{
    public const string Crm = "crm";
    public const string Sales = "sales";
    public const string Inventory = "inventory";
    public const string Resource = "resource";
    public const string Setting = "setting";

    public static readonly string[] All = [Crm, Sales, Inventory, Resource, Setting];

    // Modules that can be granted to a security role via the API. Setting is deliberately excluded -
    // it's only ever reachable through the hardcoded Admin bypass in TokenService/authorization policies.
    public static readonly string[] Assignable = [Crm, Sales, Inventory, Resource];
}
