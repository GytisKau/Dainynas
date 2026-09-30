using Dainynas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Dainynas.Api.Data;

public class DainynasDbContext(DbContextOptions<DainynasDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Song> Songs => Set<Song>();
    public DbSet<Performer> Performers => Set<Performer>();
    public DbSet<Album> Albums => Set<Album>();
    public DbSet<AlbumSong> AlbumSongs => Set<AlbumSong>();
    public DbSet<Comment> Comments => Set<Comment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(user => user.Email)
            .IsUnique();

        modelBuilder.Entity<AlbumSong>()
            .HasKey(albumSong => new
            {
                albumSong.AlbumId,
                albumSong.SongId
            });

        modelBuilder.Entity<AlbumSong>()
            .HasOne(albumSong => albumSong.Album)
            .WithMany(album => album.AlbumSongs)
            .HasForeignKey(albumSong => albumSong.AlbumId);

        modelBuilder.Entity<AlbumSong>()
            .HasOne(albumSong => albumSong.Song)
            .WithMany(song => song.AlbumSongs)
            .HasForeignKey(albumSong => albumSong.SongId);

        modelBuilder.Entity<Comment>()
            .HasOne(comment => comment.Song)
            .WithMany(song => song.Comments)
            .HasForeignKey(comment => comment.SongId);

        base.OnModelCreating(modelBuilder);
    }
}