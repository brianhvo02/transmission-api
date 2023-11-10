import Transmission from "./Transmission.js";

const client = new Transmission('localhost', 9091, '/transmission/');
const addRes = await client.torrentAdd('https://nyaa.si/download/1739865.torrent');
console.log(addRes);
const getRes = await client.torrentGet(['id', 'name']);
console.log(getRes.arguments);
const removeRes = await client.torrentRemove({ ids: addRes.arguments.id, deleteLocalData: true });
console.log(removeRes);