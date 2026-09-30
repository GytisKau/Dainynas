const BASE_URL = process.env.BASE_URL ?? "http://localhost:5272";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@dainynas.lt";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const created = {
    performerIds: [],
    songIds: [],
    albumIds: [],
    commentIds: []
};

async function request(path, options = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers ?? {})
        }
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

async function cleanup() {
    console.log("\nCleaning up test data...");

    for (const commentId of created.commentIds.reverse()) {
        try {
            await request(`/api/comments/${commentId}`, {
                method: "DELETE"
            });
        } catch {}
    }

    for (const albumId of created.albumIds.reverse()) {
        try {
            await request(`/api/albums/${albumId}`, {
                method: "DELETE"
            });
        } catch {}
    }

    for (const songId of created.songIds.reverse()) {
        try {
            await request(`/api/songs/${songId}`, {
                method: "DELETE"
            });
        } catch {}
    }

    for (const performerId of created.performerIds.reverse()) {
        try {
            await request(`/api/performers/${performerId}`, {
                method: "DELETE"
            });
        } catch {}
    }

    console.log("Cleanup finished.");
}

async function main() {
    assert(
        ADMIN_PASSWORD,
        "ADMIN_PASSWORD environment variable is required"
    );

    console.log(`Testing API: ${BASE_URL}\n`);

    console.log("User Authentication & authorization\n");

    const testEmail = `user-${Date.now()}@dainynas.lt`;
    const testPassword = "LabaiSlaptas123!";

    // AUTH 1: Register
    const registerResponse = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
            email: testEmail,
            password: testPassword
        })
    });

    assert(
        registerResponse.status === 201,
        `REGISTER expected 201, got ${registerResponse.status}`
    );

    assert(
        typeof registerResponse.body.token === "string",
        "REGISTER did not return JWT token"
    );

    assert(
        registerResponse.body.role === "User",
        "New user should have User role"
    );

    const token = registerResponse.body.token;

    pass("REGISTER user -> 201");


    // AUTH 2: JWT turi role claim
    function decodeJwtPayload(jwt) {
        const parts = jwt.split(".");

        assert(parts.length === 3, "Invalid JWT format");

        const payload = parts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const padded =
            payload + "=".repeat((4 - payload.length % 4) % 4);

        return JSON.parse(
            Buffer.from(padded, "base64").toString("utf8")
        );
    }

    const jwtPayload = decodeJwtPayload(token);

    const roleClaim =
        jwtPayload[
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
        ] ?? jwtPayload.role;

    assert(
        roleClaim === "User",
        `JWT expected role User, got ${roleClaim}`
    );

    pass("JWT contains role claim -> User");


    // AUTH 3: Duplicate registration
    const duplicateRegister = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
            email: testEmail,
            password: testPassword
        })
    });

    assert(
        duplicateRegister.status === 400,
        `Duplicate REGISTER expected 400, got ${duplicateRegister.status}`
    );

    pass("Duplicate registration -> 400");


    // AUTH 4: Login
    const loginResponse = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email: testEmail,
            password: testPassword
        })
    });

    assert(
        loginResponse.status === 200,
        `LOGIN expected 200, got ${loginResponse.status}`
    );

    assert(
        typeof loginResponse.body.token === "string",
        "LOGIN did not return JWT token"
    );

    const loginToken = loginResponse.body.token;

    pass("LOGIN -> 200");


    // AUTH 5: Wrong password
    const badLoginResponse = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email: testEmail,
            password: "BlogasSlaptazodis123!"
        })
    });

    assert(
        badLoginResponse.status === 401,
        `Bad LOGIN expected 401, got ${badLoginResponse.status}`
    );

    pass("LOGIN with wrong password -> 401");


    // AUTH 6: /me without token
    const meWithoutToken = await request("/api/auth/me");

    assert(
        meWithoutToken.status === 401,
        `/me without JWT expected 401, got ${meWithoutToken.status}`
    );

    pass("GET /auth/me without JWT -> 401");


    // AUTH 7: /me with token
    const meResponse = await request("/api/auth/me", {
        headers: {
            Authorization: `Bearer ${loginToken}`
        }
    });

    assert(
        meResponse.status === 200,
        `/me with JWT expected 200, got ${meResponse.status}`
    );

    assert(
        meResponse.body.email === testEmail,
        "Authenticated user email does not match"
    );

    assert(
        meResponse.body.role === "User",
        "Authenticated user should have User role"
    );

    pass("GET /auth/me with JWT -> 200");


    // AUTH 8: User tries Admin endpoint
    const adminResponse = await request("/api/auth/admin", {
        headers: {
            Authorization: `Bearer ${loginToken}`
        }
    });

    assert(
        adminResponse.status === 403,
        `/admin with User JWT expected 403, got ${adminResponse.status}`
    );

    pass("GET /auth/admin with User role -> 403");

    console.log();

    console.log("Admin Authentication & authorization\n");

    const adminLoginResponse = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        })
    });

    assert(
        adminLoginResponse.status === 200,
        `Admin LOGIN expected 200, got ${adminLoginResponse.status}`
    );

    assert(
        adminLoginResponse.body.role === "Admin",
        "Admin user should have Admin role"
    );

    const adminToken = adminLoginResponse.body.token;

    pass("LOGIN admin -> 200");


    // Patikriname Admin rolę pačiame JWT
    const adminJwtPayload = decodeJwtPayload(adminToken);

    const adminRoleClaim =
        adminJwtPayload[
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
        ] ?? adminJwtPayload.role;

    assert(
        adminRoleClaim === "Admin",
        `JWT expected Admin role, got ${adminRoleClaim}`
    );

    pass("JWT contains role claim -> Admin");


    // Admin gali pasiekti Admin endpoint
    const adminEndpointResponse =
        await request("/api/auth/admin", {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });

    assert(
        adminEndpointResponse.status === 200,
        `/admin with Admin JWT expected 200, got ${adminEndpointResponse.status}`
    );

    pass("GET /auth/admin with Admin role -> 200");


    console.log("\nPerformers,\n");


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
    created.performerIds.push(performerId);
    pass("POST performer -> 201");

    // 2. GET performer
    const getPerformer = await request(`/api/performers/${performerId}`);

    assert(getPerformer.status === 200, "GET performer expected 200");
    assert(getPerformer.body.name === "Ona Grigaliūnienė", "Wrong performer returned");
    pass("GET performer -> 200");

    console.log("\nSongs\n")

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
        created.songIds.push(response.body.id);
        pass(`POST song "${song.title}" -> 201`);
    }

    // 6. GET songs
    const getSongs = await request("/api/songs");

    assert(getSongs.status === 200, "GET songs expected 200");
    assert(Array.isArray(getSongs.body.items), "GET songs.items did not return array");
    pass("GET songs -> 200");

    const pagedSongs = await request("/api/songs?page=1&pageSize=2");

    assert(pagedSongs.status === 200,            `Paged songs expected 200, got ${pagedSongs.status}`);
    assert(Array.isArray(pagedSongs.body.items), "Paged songs should contain items array");
    assert(pagedSongs.body.items.length <= 2,    "Page should contain at most 2 songs");
    assert(pagedSongs.body.page === 1,           "Expected page 1");
    assert(pagedSongs.body.pageSize === 2,       "Expected pageSize 2");

    pass("GET songs with pagination -> 200");

    const filteredSongs = await request(`/api/songs?performerId=${performerId}&page=1&pageSize=10`);

    assert(filteredSongs.status === 200, `Filtered songs expected 200, got ${filteredSongs.status}`);
    assert(filteredSongs.body.items
        .every(song => song.performerId === performerId), "Song filtering by performerId failed");

    pass("GET songs with filtering -> 200");

    const invalidPage = await request("/api/songs?page=0&pageSize=10");

    assert(invalidPage.status === 400, `Invalid page expected 400, got ${invalidPage.status}`);

    pass("GET songs with invalid page -> 400");


    console.log("\nComments\n");


    const commentAuthor = "Test User";
    const commentResponse = await request("/api/comments", {
        method: "POST",
        body: JSON.stringify({
            text: "Labai graži ir įdomi folklorinė daina.",
            authorName: commentAuthor,
            songId: songIds[0]
        })
    });

    assert(commentResponse.status === 201,
        `POST comment expected 201, got ${commentResponse.status}`);

    assert(commentResponse.body.text === "Labai graži ir įdomi folklorinė daina.",
        "Created comment text does not match");

    assert(commentResponse.body.songId === songIds[0], "Created comment SongId does not match");

    const commentId = commentResponse.body.id;

    created.commentIds.push(commentId);

    pass("POST comment -> 201");


    const getCommentResponse = await request(`/api/comments/${commentId}`);
 
    assert(
        getCommentResponse.status === 200,
        `GET comment expected 200, got ${getCommentResponse.status}`);

    assert(
        getCommentResponse.body.id === commentId,
        "GET comment returned wrong id");

    assert(
        getCommentResponse.body.authorName === commentAuthor,
        "GET comment returned wrong author");

    pass("GET comment by id -> 200");


    const commentsListResponse =
        await request("/api/comments?page=1&pageSize=5");

    assert(commentsListResponse.status === 200,
        `GET comments expected 200, got ${commentsListResponse.status}`);

    assert(Array.isArray(commentsListResponse.body.items),
        "Comments response should contain items array");

    assert(commentsListResponse.body.page === 1,
        "Comments page should be 1");

    assert(commentsListResponse.body.pageSize === 5,
        "Comments pageSize should be 5");

    assert(commentsListResponse.body.items.some(comment => comment.id === commentId),
        "Created comment was not found in comments list");

    pass("GET comments with pagination -> 200");


    const filteredCommentsResponse =
        await request(`/api/comments?authorName=${encodeURIComponent(commentAuthor)}&page=1&pageSize=10`);

    assert(
        filteredCommentsResponse.status === 200,
        `Filtered comments expected 200, got ${filteredCommentsResponse.status}`
    );

    assert(
        filteredCommentsResponse.body.items.some(
            comment =>
                comment.id === commentId &&
                comment.authorName === commentAuthor
        ),
        "Comment filtering by authorName failed"
    );

    pass("GET comments with author filter -> 200");

    const textFilterResponse = await request("/api/comments?text=folklorinė&page=1&pageSize=10");

    assert(textFilterResponse.status === 200,
        `Filtered comments by text expected 200, got ${textFilterResponse.status}`);

    assert(textFilterResponse.body.items.some(
            comment => comment.id === commentId
        ),
        "Comment filtering by text failed");

    pass("GET comments with text filter -> 200");

    const updateCommentResponse =
        await request(`/api/comments/${commentId}`, {
            method: "PUT",
            body: JSON.stringify({
                text: "Atnaujintas testinis komentaras.",
                authorName: "Updated User",
                songId: songIds[0]
            })
        });

    assert(
        updateCommentResponse.status === 204,
        `PUT comment expected 204, got ${updateCommentResponse.status}`
    );

    pass("PUT comment -> 204");

    const updatedCommentResponse = await request(`/api/comments/${commentId}`);

    assert(updatedCommentResponse.status === 200,
        `GET updated comment expected 200, got ${updatedCommentResponse.status}`);

    assert(updatedCommentResponse.body.text === "Atnaujintas testinis komentaras.",
        "Updated comment text does not match");

    assert(updatedCommentResponse.body.authorName === "Updated User",
        "Updated comment author does not match");

    pass("GET updated comment -> 200");

    const scopedCommentsResponse =
        await request(`/api/performers/${performerId}/songs/${songIds[0]}/comments`);

    assert(scopedCommentsResponse.status === 200,
        `Hierarchical comments expected 200, got ${scopedCommentsResponse.status}`);

    assert(Array.isArray(scopedCommentsResponse.body),
        "Hierarchical comments response should be an array");

    assert(scopedCommentsResponse.body.some(
            comment => comment.id === commentId),
        "Hierarchical endpoint did not return created comment");

    pass("GET /performers/{performerId}/songs/{songId}/comments -> 200");

    const invalidScopedCommentsResponse =
        await request(
            `/api/performers/${performerId}/songs/999999/comments`
        );

    assert(
        invalidScopedCommentsResponse.status === 404,
        `Invalid hierarchical scope expected 404, got ${invalidScopedCommentsResponse.status}`
    );

    pass("Hierarchical comments with invalid song -> 404");

    const invalidCommentResponse =
        await request("/api/comments", {
            method: "POST",
            body: JSON.stringify({
                text: "Šis komentaras neturėtų būti sukurtas.",
                authorName: "Test User",
                songId: 999999
            })
        });

    assert(invalidCommentResponse.status === 400,
        `Comment with invalid SongId expected 400, got ${invalidCommentResponse.status}`);

    pass("POST comment with invalid SongId -> 400");

    const invalidCommentsPageResponse =
        await request("/api/comments?page=0&pageSize=10");

    assert(
        invalidCommentsPageResponse.status === 400,
        `Invalid comments page expected 400, got ${invalidCommentsPageResponse.status}`
    );

    pass("GET comments with invalid page -> 400");

    const deleteCommentResponse =
        await request(`/api/comments/${commentId}`, { method: "DELETE"});

    created.commentIds = created.commentIds.filter(id => id !== commentId);

    assert(deleteCommentResponse.status === 204,
        `DELETE comment expected 204, got ${deleteCommentResponse.status}`);

    pass("DELETE comment -> 204");

    const deletedCommentResponse =
        await request(`/api/comments/${commentId}`);

    assert(
        deletedCommentResponse.status === 404,
        `GET deleted comment expected 404, got ${deletedCommentResponse.status}`
    );

    pass("GET deleted comment -> 404");



    console.log("\nAlbums\n")


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
    created.albumIds.push(albumId);
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
}

async function run() {
    try {
        await main();

        console.log("\nALL API TESTS PASSED");
    } catch (error) {
        console.error("\nTEST FAILED");
        console.error(error.message);

        process.exitCode = 1;
    } finally {
        await cleanup();
    }
}

run();