import Transmission from "./Transmission.js";

const client = new Transmission('localhost', 9091, '/transmission/');
// const addRes = await client.torrentAdd('https://nyaa.si/download/1739865.torrent');
// console.log(addRes);
// const removeRes = await client.torrentRemove({ ids: 6 });
// console.log(removeRes);