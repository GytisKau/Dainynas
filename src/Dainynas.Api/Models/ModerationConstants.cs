namespace Dainynas.Api.Models;

public static class ModerationEntityTypes
{
    public const string Performer = "Performer";
    public const string Song = "Song";
    public const string Album = "Album";
}

public static class ModerationRequestTypes
{
    public const string Publish = "Publish";
    public const string Update = "Update";
}

public static class ModerationStatuses
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
}