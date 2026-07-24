using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRMPlus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSecurityRoleModulesAndModuleRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Modules",
                table: "SecurityRoles",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            // Seed one security role per non-Setting module, with stable IDs (Setting is Admin-only - see AppModules.Assignable).
            migrationBuilder.Sql(@"
                INSERT INTO SecurityRoles (Id, Name, Description, Modules, CreatedAt) VALUES
                ('10000000-0000-0000-0000-000000000004', 'CRM', 'CRM module access', 'crm', SYSUTCDATETIME()),
                ('10000000-0000-0000-0000-000000000005', 'Sales', 'Sales module access', 'sales', SYSUTCDATETIME()),
                ('10000000-0000-0000-0000-000000000006', 'Inventory', 'Inventory module access', 'inventory', SYSUTCDATETIME()),
                ('10000000-0000-0000-0000-000000000007', 'Resource', 'Resource module access', 'resource', SYSUTCDATETIME())");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DELETE FROM UserSecurityRoles WHERE SecurityRoleId IN (
                    '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005',
                    '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000007');
                DELETE FROM TeamSecurityRoles WHERE SecurityRoleId IN (
                    '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005',
                    '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000007');
                DELETE FROM SecurityRoles WHERE Id IN (
                    '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005',
                    '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000007');");

            migrationBuilder.DropColumn(
                name: "Modules",
                table: "SecurityRoles");
        }
    }
}
