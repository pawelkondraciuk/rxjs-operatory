const fs=require('node:fs'),assert=require('node:assert/strict');

function slideNotes(id) {
 const html=fs.readFileSync('index.html','utf8');
 const template=html.match(new RegExp(`<template data-slide-notes="${id}">([\\s\\S]*?)</template>`));
 const baseId=id==='20-sharereplay-2'?'20-sharereplay':id;
 const section=html.match(new RegExp(`<section id="${baseId}"[^>]*>([\\s\\S]*?)</section>`));
 const note=template?.[1]||section?.[1].match(/<aside class="notes">([\s\S]*?)<\/aside>/)?.[1];
 assert.ok(note,`${id}: notatki slajdu`);
 assert.match(note,/^<ul><li><strong>/);
 assert.doesNotMatch(note,/data-checkpoint|<p>|Prawo:|Na ekranie:|⏸|SALA:|Stój poważnie/);
 return note.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
module.exports={slideNotes};
