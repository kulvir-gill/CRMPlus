using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRMPlus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCrmAccessLevelAndOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AccessLevel",
                table: "SecurityRoles",
                type: "int",
                nullable: false,
                defaultValue: 2);

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerId",
                table: "Contacts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerId",
                table: "Accounts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_OwnerId",
                table: "Contacts",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_OwnerId",
                table: "Accounts",
                column: "OwnerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Accounts_Users_OwnerId",
                table: "Accounts",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Contacts_Users_OwnerId",
                table: "Contacts",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Seed CRM ReadOnly / CRM UserLevel roles alongside the existing "CRM" (Full) role, with stable IDs.
            migrationBuilder.Sql(@"
                INSERT INTO SecurityRoles (Id, Name, Description, Modules, AccessLevel, CreatedAt) VALUES
                ('10000000-0000-0000-0000-000000000008', 'CRM ReadOnly', 'View all CRM records; cannot create, edit, or delete', 'crm', 0, SYSUTCDATETIME()),
                ('10000000-0000-0000-0000-000000000009', 'CRM UserLevel', 'View/edit only CRM records owned by the user or a teammate', 'crm', 1, SYSUTCDATETIME())");

            migrationBuilder.Sql(@"
                UPDATE SecurityRoles SET AccessLevel = 2 WHERE Id = '10000000-0000-0000-0000-000000000004'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DELETE FROM UserSecurityRoles WHERE SecurityRoleId IN ('10000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000009');
                DELETE FROM TeamSecurityRoles WHERE SecurityRoleId IN ('10000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000009');
                DELETE FROM SecurityRoles WHERE Id IN ('10000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000009');");

            migrationBuilder.DropForeignKey(
                name: "FK_Accounts_Users_OwnerId",
                table: "Accounts");

            migrationBuilder.DropForeignKey(
                name: "FK_Contacts_Users_OwnerId",
                table: "Contacts");

            migrationBuilder.DropIndex(
                name: "IX_Contacts_OwnerId",
                table: "Contacts");

            migrationBuilder.DropIndex(
                name: "IX_Accounts_OwnerId",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "AccessLevel",
                table: "SecurityRoles");

            migrationBuilder.DropColumn(
                name: "OwnerId",
                table: "Contacts");

            migrationBuilder.DropColumn(
                name: "OwnerId",
                table: "Accounts");
        }
    }
}
