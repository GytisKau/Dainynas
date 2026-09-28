const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";

async function request(path, options = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers ?? {})
        },
        ...options
    });

    let body = null;

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
        body = await response.json();
    }

    return {
        status: response.status,
        body,
        headers: response.headers
    };
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function pass(name) {
    console.log(`✓ ${name}`);
}

async function main() {
    console.log(`Testing API: ${BASE_URL}\n`);

    // 1. POST performer
    const performerResponse = await request("/api/performers", {
        method: "POST",
        body: JSON.stringify(
            {
                name: "Ona Grigaliūnienė",
                birthYear: 1890,
                residence: "Slabada k., Kaišiadorių sen., Kaišiadorių r. sav., Kauno apsk",
                photoUrl: "https://www.tautosakos-rankrastynas.lt/imgHashed/c2k9OTAwJmZhaWxhcz12YWl6ZGFzL0xUUkZ0LzIzMC5qcGc=.jpg"
            }
        )
    });

    assert(performerResponse.status === 201, "POST performer expected 201");
    const performerId = performerResponse.body.id;
    pass("POST performer -> 201");

    // 2. GET performer
    const getPerformer = await request(`/api/performers/${performerId}`);

    assert(getPerformer.status === 200, "GET performer expected 200");
    assert(getPerformer.body.name === "Ona Grigaliūnienė", "Wrong performer returned");
    pass("GET performer -> 200");

    // 3-5. POST songs
    const songs = [
        {
            title: "Oi, aš pavirsiu",
            lyrics: "Oi, aš pavirsiu žaliaj rūtela",
            recordingYear: 1965,
            recordingPlace: "Slabada",
            externalArchiveUrl: "https://irasai.archyvas.llti.lt/index.php?id=57226",
            audioUrl: "https://irasai.archyvas.llti.lt/mp3/LTRF_pl_458/pl.458-01.mp3",
            isPublic: true
        },
        {
            title: "Siuntė mani motinėla",
            lyrics: "Siuntė mani motinėla\nIn Dunojų vandenėlia",
            recordingYear: 1965,
            recordingPlace: "Slabada",
            externalArchiveUrl: "https://etnomuzikologai.lmta.lt/item/44464",
            audioUrl: "https://etnomuzikologai.lmta.lt/files/audio/KF_4551_007.mp3",
            isPublic: true
        },
        {
            title: "Ty ant kalna, ant kranta",
            lyrics: "Ty ant kalna, ant kranta\nŽalia liepa stovėja",
            recordingYear: 1965,
            recordingPlace: "Slabada",
            externalArchiveUrl: "https://etnomuzikologai.lmta.lt/item/44357",
            audioUrl: "https://etnomuzikologai.lmta.lt/files/audio/KF_5016_009.mp3",
            isPublic: true
        }
    ];

    const songIds = [];

    for (const song of songs) {
        const response = await request("/api/songs", {
            method: "POST",
            body: JSON.stringify({
                ...song,
                performerId
            })
        });

        assert(response.status === 201, `POST song "${song.title}" expected 201`);

        songIds.push(response.body.id);
        pass(`POST song "${song.title}" -> 201`);
    }

    // 6. GET songs
    const getSongs = await request("/api/songs");

    assert(getSongs.status === 200, "GET songs expected 200");
    assert(Array.isArray(getSongs.body), "GET songs did not return array");
    pass("GET songs -> 200");

    // 7. POST album
    const createAlbum = await request("/api/albums", {
        method: "POST",
        body: JSON.stringify({
            title: "Kaišiadorių dainos",
            description: "Kaišiadorių gyventojų dainų rinkinys",
            isPublic: true,
            songIds
        })
    });

    assert(createAlbum.status === 201, "POST album expected 201");

    const albumId = createAlbum.body.id;

    assert(createAlbum.body.songs.length === 3, "Album should contain 3 songs");
    pass("POST album -> 201");

    // 8. GET album
    const getAlbum = await request(`/api/albums/${albumId}`);

    assert(getAlbum.status === 200, "GET album expected 200");
    assert(getAlbum.body.songs.length === 3, "GET album should contain 3 songs");
    pass("GET album -> 200");

    // 9. PUT performer
    const updatePerformer = await request(`/api/performers/${performerId}`, {
        method: "PUT",
        body: JSON.stringify({
            name: "Ona Grigaliūnienė",
            birthYear: 1890,
            residence: "Slabada, Kaišiadorių r.",
            photoUrl: "https://www.tautosakos-rankrastynas.lt/imgHashed/c2k9OTAwJmZhaWxhcz12YWl6ZGFzL0xUUkZ0LzIzMC5qcGc=.jpg"
        })
    });

    assert(updatePerformer.status === 204, "PUT performer expected 204");
    pass("PUT performer -> 204");

    // 10. PUT song
    const updateSong = await request(`/api/songs/${songIds[0]}`, {
        method: "PUT",
        body: JSON.stringify({
            ...songs[0],
            lyrics: "Atnaujintas demonstracinis tekstas",
            performerId
        })
    });

    assert(updateSong.status === 204, "PUT song expected 204");
    pass("PUT song -> 204");

    // 11. PUT album - pakeičiame dainų tvarką
    const reorderedSongIds = [
        songIds[2],
        songIds[0],
        songIds[1]
    ];

    const updateAlbum = await request(`/api/albums/${albumId}`, {
        method: "PUT",
        body: JSON.stringify({
            title: "Kaišiadorių dainos",
            description: "Atnaujintas Kaišiadorių gyventojų dainų rinkinys",
            isPublic: true,
            songIds: reorderedSongIds
        })
    });

    assert(updateAlbum.status === 204, "PUT album expected 204");
    pass("PUT album -> 204");

    // Patikrinam, ar tvarka tikrai pasikeitė
    const reorderedAlbum = await request(`/api/albums/${albumId}`);

    assert(reorderedAlbum.status === 200, "GET reordered album expected 200");
    assert(reorderedAlbum.body.songs[0].id === songIds[2], "Album song order was not updated");
    pass("GET album song order updated");

    // 12. GET performers
    const performers = await request("/api/performers");

    assert(performers.status === 200, "GET performers expected 200");
    pass("GET performers -> 200");

    // 13. GET albums
    const albums = await request("/api/albums");

    assert(albums.status === 200, "GET albums expected 200");
    pass("GET albums -> 200");

    // 14. DELETE album
    const deleteAlbum = await request(`/api/albums/${albumId}`, {
        method: "DELETE"
    });

    assert(deleteAlbum.status === 204, "DELETE album expected 204");
    pass("DELETE album -> 204");

    // DELETE songs
    for (const songId of songIds) {
        const response = await request(`/api/songs/${songId}`, {
            method: "DELETE"
        });

        assert(response.status === 204, `DELETE song ${songId} expected 204`);
    }

    pass("DELETE songs -> 204");

    // 15. DELETE performer
    const deletePerformer = await request(`/api/performers/${performerId}`, {
        method: "DELETE"
    });

    assert(deletePerformer.status === 204, "DELETE performer expected 204");
    pass("DELETE performer -> 204");

    // 404 test
    const missingPerformer = await request(`/api/performers/${performerId}`);

    assert(missingPerformer.status === 404, "Missing performer expected 404");
    pass("GET performer / Missing resource -> 404");

    // 400 test
    const invalidPerformer = await request("/api/performers", {
        method: "POST",
        body: JSON.stringify({
            name: "",
            birthYear: 1500,
            photoUrl: "not-a-url"
        })
    });

    assert(invalidPerformer.status === 400, "Invalid payload expected 400");
    pass("POST performer / Invalid payload -> 400");

    console.log("\n✓ ALL API TESTS PASSED");
}

main().catch(error => {
    console.error("\n✗ TEST FAILED");
    console.error(error.message);
    process.exit(1);
});