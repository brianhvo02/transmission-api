import Transmission from "./Transmission.js";

const client = new Transmission('localhost', 9091, '/transmission/');
const res = await client.torrentAdd('https://nyaa.si/download/1739865.torrent');

const test = res.arguments;