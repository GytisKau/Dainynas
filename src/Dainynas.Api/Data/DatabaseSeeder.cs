using Dainynas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Dainynas.Api.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(DainynasDbContext context)
    {
        // Jei domeno duomenų jau yra, nieko papildomai nekuriame.
        if (await context.Performers.AnyAsync() ||
            await context.Songs.AnyAsync() ||
            await context.Comments.AnyAsync() ||
            await context.Albums.AnyAsync())
        {
            return;
        }

        var performers = new List<Performer>
        {
            new()
            {
                Name = "Ona Grigaliūnienė",
                BirthYear = 1890,
                Residence = "Slabada k., Kaišiadorių r.",
                PhotoUrl =
                    "https://www.tautosakos-rankrastynas.lt/imgHashed/c2k9OTAwJmZhaWxhcz12YWl6ZGFzL0xUUkZ0LzIzMC5qcGc=.jpg"
            },

            new()
            {
                Name = "Marija Petrauskienė",
                BirthYear = 1902,
                Residence = "Aukštadvaris, Trakų r."
            },

            new()
            {
                Name = "Jonas Kazlauskas",
                BirthYear = 1898,
                Residence = "Merkinė, Varėnos r."
            },

            new()
            {
                Name = "Antanina Žukauskienė",
                BirthYear = 1905,
                Residence = "Rumšiškės, Kaišiadorių r."
            },

            new()
            {
                Name = "Petras Vaitkus",
                BirthYear = 1901,
                Residence = "Dusetos, Zarasų r."
            }
        };

        context.Performers.AddRange(performers);
        await context.SaveChangesAsync();

        var songs = new List<Song>
        {
            new()
            {
                Title = "Oi, aš pavirsiu",
                Lyrics =
                    "Oi, aš pavirsiu gegute raibąja...",
                RecordingYear = 1965,
                RecordingPlace = "Slabada, Kaišiadorių r.",
                ExternalArchiveUrl =
                    "https://irasai.archyvas.llti.lt/index.php?id=57226",
                AudioUrl =
                    "https://irasai.archyvas.llti.lt/mp3/LTRF_pl_458/pl.458-01.mp3",
                IsPublic = true,
                PerformerId = performers[0].Id
            },

            new()
            {
                Title = "Siuntė mani motinėla",
                Lyrics =
                    "Siuntė mani motinėla...",
                RecordingYear = 1965,
                RecordingPlace = "Slabada, Kaišiadorių r.",
                ExternalArchiveUrl =
                    "https://etnomuzikologai.lmta.lt/item/44464",
                AudioUrl =
                    "https://etnomuzikologai.lmta.lt/files/audio/KF_4551_007.mp3",
                IsPublic = true,
                PerformerId = performers[0].Id
            },

            new()
            {
                Title = "Ty ant kalna, ant kranta",
                Lyrics =
                    "Ty ant kalna, ant kranta...",
                RecordingYear = 1965,
                RecordingPlace = "Slabada, Kaišiadorių r.",
                ExternalArchiveUrl =
                    "https://etnomuzikologai.lmta.lt/item/44357",
                AudioUrl =
                    "https://etnomuzikologai.lmta.lt/files/audio/KF_5016_009.mp3",
                IsPublic = true,
                PerformerId = performers[0].Id
            },

            new()
            {
                Title = "Ant kalno mūrai",
                Lyrics =
                    "Ant kalno mūrai, joja lietuviai...",
                RecordingYear = 1968,
                RecordingPlace = "Aukštadvaris, Trakų r.",
                IsPublic = true,
                PerformerId = performers[1].Id
            },

            new()
            {
                Title = "Aš pasėjau žalią rūtą",
                Lyrics =
                    "Aš pasėjau žalią rūtą...",
                RecordingYear = 1971,
                RecordingPlace = "Merkinė, Varėnos r.",
                IsPublic = true,
                PerformerId = performers[2].Id
            },

            new()
            {
                Title = "Vai tu rugeli",
                Lyrics =
                    "Vai tu rugeli, žalias rugeli...",
                RecordingYear = 1969,
                RecordingPlace = "Rumšiškės, Kaišiadorių r.",
                IsPublic = true,
                PerformerId = performers[3].Id
            },

            new()
            {
                Title = "Augo girioj ąžuolėlis",
                Lyrics =
                    "Augo girioj ąžuolėlis...",
                RecordingYear = 1973,
                RecordingPlace = "Dusetos, Zarasų r.",
                IsPublic = true,
                PerformerId = performers[4].Id
            }
        };

        context.Songs.AddRange(songs);
        await context.SaveChangesAsync();

        var albums = new List<Album>
        {
            new()
            {
                Title = "Kaišiadorių dainos",
                Description =
                    "Kaišiadorių krašto folklorinių dainų rinkinys.",
                IsPublic = true,
                AlbumSongs = new List<AlbumSong>
                {
                    new()
                    {
                        SongId = songs[0].Id,
                        Position = 1
                    },
                    new()
                    {
                        SongId = songs[1].Id,
                        Position = 2
                    },
                    new()
                    {
                        SongId = songs[2].Id,
                        Position = 3
                    },
                    new()
                    {
                        SongId = songs[5].Id,
                        Position = 4
                    }
                }
            },

            new()
            {
                Title = "Dzūkijos dainos",
                Description =
                    "Dzūkijos regiono tradicinių dainų rinkinys.",
                IsPublic = true,
                AlbumSongs = new List<AlbumSong>
                {
                    new()
                    {
                        SongId = songs[2].Id,
                        Position = 1
                    },
                    new()
                    {
                        SongId = songs[4].Id,
                        Position = 2
                    }
                }
            },

            new()
            {
                Title = "Lietuvių liaudies dainų rinktinė",
                Description =
                    "Įvairių Lietuvos regionų folklorinių dainų rinktinė.",
                IsPublic = true,
                AlbumSongs = new List<AlbumSong>
                {
                    new()
                    {
                        SongId = songs[0].Id,
                        Position = 1
                    },
                    new()
                    {
                        SongId = songs[3].Id,
                        Position = 2
                    },
                    new()
                    {
                        SongId = songs[4].Id,
                        Position = 3
                    },
                    new()
                    {
                        SongId = songs[6].Id,
                        Position = 4
                    }
                }
            }
        };

        context.Albums.AddRange(albums);
        await context.SaveChangesAsync();

        var comments = new List<Comment>
        {
            new()
            {
                Text =
                    "Įdomus senosios lietuvių dainavimo tradicijos pavyzdys.",
                AuthorName = "Rasa",
                CreatedAt = new DateTime(
                    2026, 9, 20, 10, 0, 0,
                    DateTimeKind.Utc),
                SongId = songs[0].Id
            },

            new()
            {
                Text =
                    "Vertingas įrašas dėl išlikusios autentiškos melodijos.",
                AuthorName = "Mantas",
                CreatedAt = new DateTime(
                    2026, 9, 21, 11, 30, 0,
                    DateTimeKind.Utc),
                SongId = songs[0].Id
            },

            new()
            {
                Text =
                    "Dainos tekstas labai gerai atspindi regioninę tradiciją.",
                AuthorName = "Eglė",
                CreatedAt = new DateTime(
                    2026, 9, 22, 9, 15, 0,
                    DateTimeKind.Utc),
                SongId = songs[1].Id
            },

            new()
            {
                Text =
                    "Naudingas šaltinis folkloro tyrimams.",
                AuthorName = "Tomas",
                CreatedAt = new DateTime(
                    2026, 9, 23, 14, 0, 0,
                    DateTimeKind.Utc),
                SongId = songs[2].Id
            },

            new()
            {
                Text =
                    "Įdomu palyginti šį variantą su kitų regionų dainomis.",
                AuthorName = "Ieva",
                CreatedAt = new DateTime(
                    2026, 9, 24, 16, 45, 0,
                    DateTimeKind.Utc),
                SongId = songs[3].Id
            },

            new()
            {
                Text =
                    "Gerai išsaugotas dainos tekstas.",
                AuthorName = "Paulius",
                CreatedAt = new DateTime(
                    2026, 9, 25, 12, 20, 0,
                    DateTimeKind.Utc),
                SongId = songs[4].Id
            },

            new()
            {
                Text =
                    "Ši daina tinkama regioninių skirtumų analizei.",
                AuthorName = "Gabija",
                CreatedAt = new DateTime(
                    2026, 9, 26, 8, 40, 0,
                    DateTimeKind.Utc),
                SongId = songs[5].Id
            },

            new()
            {
                Text =
                    "Gražus tradicinės lietuvių dainos pavyzdys.",
                AuthorName = "Lukas",
                CreatedAt = new DateTime(
                    2026, 9, 27, 18, 10, 0,
                    DateTimeKind.Utc),
                SongId = songs[6].Id
            }
        };

        context.Comments.AddRange(comments);
        await context.SaveChangesAsync();
    }
}