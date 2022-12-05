const { remoteCacheServer } = require("remote-sqlite-database");

const Server = new remoteCacheServer({
    username: "CaletaDB",
    password: "gamer0706",
    name: "anti_nuke_system",
    dataDir: `${process.cwd()}/db files/anti_nuke_system`,
    port: 4073, // Any port
    tls: true,
    debug: true // if enabled u see all the actions ;)
});
// Following Events are optional
Server
    .on("serverReady", () => {
        console.log("DatabaseCacheServer ready and waiting for connections");
    })
    .on("serverError", (error) => {
        console.error("DatabaseCacheServer error, ERROR:\n", error, "\n---\n");
    })
    .on("serverClose", (reason) => {
        console.log("DatabaseCacheServer closed");
    })
    .on("serverConnect", (connection, payload) => {
        console.log("DatabaseCacheServer a Client Connected");
    })
    .on("serverDisconnect", (connection, reason) => {
        console.log("DatabaseCacheServer a Client Disconnected");
    })
    .on("serverMessage", (message) => {
        // console.log("DatabaseCacheServer, received a Message", message);
    })
    .on("serverRequest", async (request, response, client) => {
        // console.log("DatabaseCacheRequest, received a Request", request);
    });