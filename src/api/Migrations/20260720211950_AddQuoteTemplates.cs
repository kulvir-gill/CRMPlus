using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRMPlus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuoteTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "QuoteTemplateId",
                table: "Quotes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "QuoteTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TaxRate = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    Discount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuoteTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuoteTemplates_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "QuoteTemplateLineItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuoteTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Discount = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuoteTemplateLineItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuoteTemplateLineItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_QuoteTemplateLineItems_QuoteTemplates_QuoteTemplateId",
                        column: x => x.QuoteTemplateId,
                        principalTable: "QuoteTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Quotes_QuoteTemplateId",
                table: "Quotes",
                column: "QuoteTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_QuoteTemplateLineItems_ProductId",
                table: "QuoteTemplateLineItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_QuoteTemplateLineItems_QuoteTemplateId",
                table: "QuoteTemplateLineItems",
                column: "QuoteTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_QuoteTemplates_AccountId",
                table: "QuoteTemplates",
                column: "AccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_Quotes_QuoteTemplates_QuoteTemplateId",
                table: "Quotes",
                column: "QuoteTemplateId",
                principalTable: "QuoteTemplates",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Quotes_QuoteTemplates_QuoteTemplateId",
                table: "Quotes");

            migrationBuilder.DropTable(
                name: "QuoteTemplateLineItems");

            migrationBuilder.DropTable(
                name: "QuoteTemplates");

            migrationBuilder.DropIndex(
                name: "IX_Quotes_QuoteTemplateId",
                table: "Quotes");

            migrationBuilder.DropColumn(
                name: "QuoteTemplateId",
                table: "Quotes");
        }
    }
}
