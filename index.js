const fs = require('fs');
const { join } = require('path');
const { Manager } = require("discord-hybrid-sharding");
const config = require("./botconfig/config.json");
const colors = require("colors");
const OS = require("os");
const clusterAmount = 4;
const chalk = require("chalk")
const shardsPerCluster = 4; // suggested is: 2-8
const totalShards = clusterAmount * shardsPerCluster; // suggested is to make it that 600-900 Servers are per shard, if u want to stay save, make it that it"s 400 servers / shard, and once it reached the ~1k mark, change the amount and restart
const manager = new Manager("./bot.js", { 
    token: config.token,    
    // shardList: [ 0, 1, 2, 3, 4, 5 ], // if only those shards on that host etc.
    totalShards: 4, // amount or: "auto"
    totalClusters: 2,
    mode: "process", // "process" or: "worker"
    respawn: true, 
    usev13: true
});
manager.on("clusterCreate", cluster => {
    console.log(`[SHARDING-MANAGER]: `.magenta + `Se ha creado el clúster #${cluster.id+1} | ${cluster.id+1}/${cluster.manager.totalClusters} [${cluster.manager.shardsPerClusters}/${cluster.manager.totalShards} Shards]`.green)

    cluster.on("death", function () {
        console.log(`${colors.red.bold(`Cluster ${cluster.id+1} Muerto...`)}`);
    });

    cluster.on("message", async (msg) => {
        if(!msg._sCustom) return
        if (msg.dm) {
            const { interaction, message, dm, packet } = msg
            await manager.broadcast({ interaction, message, dm, packet })
        }
    })

    cluster.on("error", e => {
        console.log(`${colors.red.bold(`Cluster ${cluster.id+1} Con error...`)}`);
        console.error(e);
    })
    
    cluster.on("disconnect", function () {
        console.log(`${colors.red.bold(`Cluster ${cluster.id+1} Desconectado..`)}`);
    });

    cluster.on("reconnecting", function () {
        console.log(`${colors.yellow.bold(`Cluster ${cluster.id} En reconexión.`)}`);
    });

    cluster.on("close", function (code) {
        console.log(`${colors.red.bold(`Cluster ${cluster.id} Cerrado con el código ${code}`)}`);
    });

    cluster.on("exit", function (code) {
        console.log(`${colors.red.bold(`Cluster ${cluster.id} Abortado con el código ${code}`)}`);
    });
});

manager.on('clientRequest', async (message) => {
    if(message._sRequest && message.songRequest){
        if(message.target === 0 || message.target) {
            const msg = await manager.clusters.get(message.target).request(message.raw);
            message.reply(msg)
        } else {
            manager.clusters.forEach(async cluster => {
               const msg = await cluster.request(message.raw);
               message.reply(msg)
            })
        }
    }
})

// Log the creation of the debug
manager.once("debug", (d) => d.includes("[CM => Manager] [Apareciendo clústers]") ? console.log(d) : "")

//Inicia un servidor para hostear en replit

setTimeout(function(){
  manager.spawn({ timeout: -1 });
}, 30000);
    

console.log(chalk.hex('#FFAA00').bold(`
///////Proceso provocado////////


///////////////////////////////////////////
Esperando 30 segundos para aparecer el siguiente clúster...
//////////////////////////////////////////////
`));

const express = require('express');
const app = express();
const port = 3400;
app.get("/", function (request, response) {
response.sendFile(__dirname + '/page.html');});
app.listen(port, () => console.log(`
     ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
     ┃                                                            
       ┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃

     ┃ 
        Servidor iniciado en el puerto 3400 | Welcome 
        to the code | By: Caletaponsio

        ┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃       
     ┃            
     ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`.rainbow.bold));

///////Ejecuta un proceso pequeño que disminuye la latencia/////////////

var exec = require('child_process').exec;

exec('npx node canvasAPI.js',
    function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
             console.log('exec error: ' + error);
        }
    });

  setTimeout(function(){
    require('child_process').exec(
    'bash start.sh',
    {stdio: 'inherit'},
    console.log(chalk.hex('#C5FF00').bold(`
====================================================
⇈
⇈  Iniciando Lavalink...
⇈
====================================================
`)),
);
}, 1);

const RemoteSqlite = fs.readdirSync(join(__dirname, 'RemoteCacheDatabases')).filter(file => file.endsWith('.js'));
for (const file of RemoteSqlite) {
  const RemoteSqlite = require(`./RemoteCacheDatabases/${file}`);
  console.log(chalk.hex('#D4FF00').bold(`
╔═════════════════════════════════════════════════════╗
║                                                     ║
║   Levantada la base de datos ${file} /-/
    By: Caletaponsio /-/   
║                                                     ║
╚═════════════════════════════════════════════════════╝`));
}


console.log(`
     ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
     ┃                                                            
       ┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃

     ┃ 
        Codigo creado por Tomato#6966 & Editado por: CDev0101 | Welcome 
        to the code | UnmongoDB powered by: Caletaponsio & Dewstouh

        ┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃       
     ┃            
     ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`.blue.bold));
