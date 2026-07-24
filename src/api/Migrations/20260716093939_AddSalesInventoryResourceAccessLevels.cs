using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRMPlus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSalesInventoryResourceAccessLevels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "OwnerId",
                table: "Quotes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerId",
                table: "Projects",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerId",
                table: "Products",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerId",
                table: "Invoices",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Quotes_OwnerId",
                table: "Quotes",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_OwnerId",
                table: "Projects",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_OwnerId",
                table: "Products",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_OwnerId",
                table: "Invoices",
                column: "OwnerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_Users_OwnerId",
                table: "Invoices",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Products_Users_OwnerId",
                table: "Products",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Users_OwnerId",
                table: "Projects",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Quotes_Users_OwnerId",
                table: "Quotes",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Seed ReadOnly/UserLevel roles for Sales, Inventory, and Resource, mirroring the CRM ReadOnly/UserLevel seed.
            migrationBuilder.Sql(@"
                INSERT INTO SecurityRoles (Id, Name, Description, Modules, AccessLevel, CreatedAt) VALUES
                ('10000000-0000-0000-0000-000000000010', 'Sales ReadOnly', 'View all Sales records; cannot create, edit, or delete', 'sales', 0, SYSUTCDATETIME()),
                ('10000000-0000-0000-0000-000000000011', 'Sales UserLevel', 'View/edit only Sales records owned by the user or a teammate', 'sales', 1, SYSUTCDATETIME()),
                ('10000000-0000-0000-0000-000000000012', 'Inventory ReadOnly', 'View all Inventory records; cannot create, edit, or delete', 'inventory', 0, SYSUTCDATETIME()),
                ('10000000-0000-0000-0000-000000000013', 'Inventory UserLevel', 'View/edit only Inventory records owned by the user or a teammate', 'inventory', 1, SYSUTCDATETIME()),
                ('10000000-0000-0000-0000-000000000014', 'Resource ReadOnly', 'View all Resource records; cannot create, edit, or delete', 'resource', 0, SYSUTCDATETIME()),
                ('10000000-0000-0000-0000-000000000015', 'Resource UserLevel', 'View/edit only Resource records owned by the user, their team, or a teammate', 'resource', 1, SYSUTCDATETIME())");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DELETE FROM UserSecurityRoles WHERE SecurityRoleId IN (
                    '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000011',
                    '10000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000013',
                    '10000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000015');
                DELETE FROM TeamSecurityRoles WHERE SecurityRoleId IN (
                    '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000011',
                    '10000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000013',
                    '10000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000015');
                DELETE FROM SecurityRoles WHERE Id IN (
                    '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000011',
                    '10000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000013',
                    '10000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000015');");

            migrationBuilder.DropForeignKey(
                name: "FK_Invoices_Users_OwnerId",
                table: "Invoices");

            migrationBuilder.DropForeignKey(
                name: "FK_Products_Users_OwnerId",
                table: "Products");

            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Users_OwnerId",
                table: "Projects");

            migrationBuilder.DropForeignKey(
                name: "FK_Quotes_Users_OwnerId",
                table: "Quotes");

            migrationBuilder.DropIndex(
                name: "IX_Quotes_OwnerId",
                table: "Quotes");

            migrationBuilder.DropIndex(
                name: "IX_Projects_OwnerId",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Products_OwnerId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_OwnerId",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "OwnerId",
                table: "Quotes");

            migrationBuilder.DropColumn(
                name: "OwnerId",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "OwnerId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "OwnerId",
                table: "Invoices");
        }
    }
}
