## install jabba and sht
## Borra de aca en adelante si solo tienes node 16.6
## nvm install 16.6 (Sólo si no tienes node 16.6)
nvm use 16.6
echo Usando node 16.6
echo Downloading Java 16...
curl -sL https://github.com/shyiko/jabba/raw/master/install.sh | bash -s -- --skip-rc && . ~/.jabba/jabba.sh
## get java 16
jabba install zulu@1.16.0
echo Java is installed.
java -version
npm i
echo Donwloading lavalink jar...
node ./lavalink-node/start.js
