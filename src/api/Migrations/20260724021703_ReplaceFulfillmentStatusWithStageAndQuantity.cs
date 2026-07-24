using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRMPlus.Api.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceFulfillmentStatusWithStageAndQuantity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FulfillmentStatus",
                table: "OrderLineItems");

            migrationBuilder.RenameColumn(
                name: "FulfillmentStatus",
                table: "Orders",
                newName: "FulfillmentStage");

            migrationBuilder.AddColumn<decimal>(
                name: "QuantityFulfilled",
                table: "OrderLineItems",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "QuantityFulfilled",
                table: "OrderLineItems");

            migrationBuilder.RenameColumn(
                name: "FulfillmentStage",
                table: "Orders",
                newName: "FulfillmentStatus");

            migrationBuilder.AddColumn<int>(
                name: "FulfillmentStatus",
                table: "OrderLineItems",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
