const { default: { stream } } = require("got");
const { createWriteStream } = require("fs");
const { execSync } = require("child_process");
const path = "./lavalink-node/Lavalink.jar";

// Always pull latest v3
const lljar = "https://github.com/lavalink-devs/Lavalink/releases/download/3.7.13/Lavalink.jar";

const start = () => {
     const download = stream(lljar).pipe(createWriteStream('Lavalink.jar'));
     download.on("finish", () => {
         execSync("java -jar Lavalink.jar", { stdio: "inherit" });
     });
 };

start();