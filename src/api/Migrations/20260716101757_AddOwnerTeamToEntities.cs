using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRMPlus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOwnerTeamToEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "OwnerTeamId",
                table: "Quotes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerTeamId",
                table: "Projects",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerTeamId",
                table: "Products",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerTeamId",
                table: "Invoices",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerTeamId",
                table: "Contacts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerTeamId",
                table: "Accounts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Quotes_OwnerTeamId",
                table: "Quotes",
                column: "OwnerTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_OwnerTeamId",
                table: "Projects",
                column: "OwnerTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_OwnerTeamId",
                table: "Products",
                column: "OwnerTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_OwnerTeamId",
                table: "Invoices",
                column: "OwnerTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_OwnerTeamId",
                table: "Contacts",
                column: "OwnerTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_OwnerTeamId",
                table: "Accounts",
                column: "OwnerTeamId");

            migrationBuilder.AddForeignKey(
                name: "FK_Accounts_Teams_OwnerTeamId",
                table: "Accounts",
                column: "OwnerTeamId",
                principalTable: "Teams",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Contacts_Teams_OwnerTeamId",
                table: "Contacts",
                column: "OwnerTeamId",
                principalTable: "Teams",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_Teams_OwnerTeamId",
                table: "Invoices",
                column: "OwnerTeamId",
                principalTable: "Teams",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Products_Teams_OwnerTeamId",
                table: "Products",
                column: "OwnerTeamId",
                principalTable: "Teams",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Teams_OwnerTeamId",
                table: "Projects",
                column: "OwnerTeamId",
                principalTable: "Teams",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Quotes_Teams_OwnerTeamId",
                table: "Quotes",
                column: "OwnerTeamId",
                principalTable: "Teams",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Accounts_Teams_OwnerTeamId",
                table: "Accounts");

            migrationBuilder.DropForeignKey(
                name: "FK_Contacts_Teams_OwnerTeamId",
                table: "Contacts");

            migrationBuilder.DropForeignKey(
                name: "FK_Invoices_Teams_OwnerTeamId",
                table: "Invoices");

            migrationBuilder.DropForeignKey(
                name: "FK_Products_Teams_OwnerTeamId",
                table: "Products");

            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Teams_OwnerTeamId",
                table: "Projects");

            migrationBuilder.DropForeignKey(
                name: "FK_Quotes_Teams_OwnerTeamId",
                table: "Quotes");

            migrationBuilder.DropIndex(
                name: "IX_Quotes_OwnerTeamId",
                table: "Quotes");

            migrationBuilder.DropIndex(
                name: "IX_Projects_OwnerTeamId",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Products_OwnerTeamId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_OwnerTeamId",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_Contacts_OwnerTeamId",
                table: "Contacts");

            migrationBuilder.DropIndex(
                name: "IX_Accounts_OwnerTeamId",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "OwnerTeamId",
                table: "Quotes");

            migrationBuilder.DropColumn(
                name: "OwnerTeamId",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "OwnerTeamId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "OwnerTeamId",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "OwnerTeamId",
                table: "Contacts");

            migrationBuilder.DropColumn(
                name: "OwnerTeamId",
                table: "Accounts");
        }
    }
}
