using System.Security.Claims;
using Dainynas.Api.DTOs.Comments;
using Dainynas.Api.DTOs.Common;
using Dainynas.Api.Models;

namespace Dainynas.Api.Extensions;

public static class CommentMappingExtensions
{
    public static CommentDto ToCommentDto(this Comment comment, ClaimsPrincipal user)
    {
        var dto = new CommentDto
        {
            Id = comment.Id,
            Text = comment.Text,
            AuthorName = comment.AuthorName,
            CreatedAt = comment.CreatedAt,
            SongId = comment.SongId
        };

        var href = $"/api/comments/{comment.Id}";

        dto.Links["self"] = new LinkDto { Href = href };
        dto.Links["song"] = new LinkDto { Href = $"/api/songs/{comment.SongId}" };

        if (user.CanManage(comment.UserId))
        {
            dto.Links["update"] = new LinkDto { Href = href, Method = "PUT" };
            dto.Links["delete"] = new LinkDto { Href = href, Method = "DELETE" };
        }

        return dto;
    }
}