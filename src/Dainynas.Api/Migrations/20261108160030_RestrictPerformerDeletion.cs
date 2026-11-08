using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dainynas.Api.Migrations
{
    /// <inheritdoc />
    public partial class RestrictPerformerDeletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Songs_Performers_PerformerId",
                table: "Songs");

            migrationBuilder.AlterColumn<int>(
                name: "SubmittedByUserId",
                table: "ModerationRequests",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddForeignKey(
                name: "FK_Songs_Performers_PerformerId",
                table: "Songs",
                column: "PerformerId",
                principalTable: "Performers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Songs_Performers_PerformerId",
                table: "Songs");

            migrationBuilder.AlterColumn<int>(
                name: "SubmittedByUserId",
                table: "ModerationRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Songs_Performers_PerformerId",
                table: "Songs",
                column: "PerformerId",
                principalTable: "Performers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
