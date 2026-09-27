using Dainynas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Dainynas.Api.Data;

public class DainynasDbContext(DbContextOptions<DainynasDbContext> options) : DbContext(options)
{
    public DbSet<Song> Songs => Set<Song>();
    public DbSet<Performer> Performers => Set<Performer>();
    public DbSet<Album> Albums => Set<Album>();
    public DbSet<AlbumSong> AlbumSongs => Set<AlbumSong>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
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

        base.OnModelCreating(modelBuilder);
    }
}