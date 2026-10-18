const {test}=require('node:test');
const assert=require('node:assert/strict');
const {modules}=require('./v2-harness.cjs');
const format=async()=>(await modules(['format'],{URL})).format;

test('Format defaults to 4:3 and accepts 16:9 spellings',async()=>{
  const f=await format();
  assert.deepEqual({...f.FORMATS['4:3']},{width:1280,height:960});
  assert.deepEqual({...f.FORMATS['16:9']},{width:1280,height:720});
  for(const search of ['','?extras','?ratio=4:3','?ratio=foo','?print-pdf'])assert.equal(f.formatFromSearch(search),'4:3',search);
  for(const search of ['?ratio=16:9','?ratio=16%3A9','?extras&ratio=16x9','?ratio=16-9&print-pdf'])assert.equal(f.formatFromSearch(search),'16:9',search);
});

test('Internal links keep the selected format',async()=>{
  const f=await format();
  assert.equal(f.withFormat('?extras#/x01-sharereplay-interval','4:3'),'?extras#/x01-sharereplay-interval');
  assert.equal(f.withFormat('?extras#/x01-sharereplay-interval','16:9'),'?extras&ratio=16:9#/x01-sharereplay-interval');
  assert.equal(f.withFormat('./#/pytania','4:3'),'./#/pytania');
  assert.equal(f.withFormat('./#/pytania','16:9'),'./?ratio=16:9#/pytania');
  assert.equal(f.withFormat('./?ratio=16:9#/pytania','4:3'),'./#/pytania');
});

test('W toggles the format in both directions, keeping extras, slide and fragment',async()=>{
  const f=await format(),base='http://localhost:5173/rxjs-operatory/';
  const wide=f.toggledFormatUrl(base+'?extras#/09-concatmap/2');
  assert.equal(wide,base+'?extras&ratio=16:9#/09-concatmap/2');
  assert.equal(f.toggledFormatUrl(wide),base+'?extras#/09-concatmap/2');
  assert.equal(f.toggledFormatUrl(base+'#/tytul'),base+'?ratio=16:9#/tytul');
  assert.equal(f.toggledFormatUrl(base+'?ratio=16:9#/tytul'),base+'#/tytul');
});
