'use strict';

const SCRIPTS = [
  'https://cdn.jsdelivr.net/npm/kuroshiro@1.2.0/dist/kuroshiro.min.js',
  'https://cdn.jsdelivr.net/npm/kuroshiro-analyzer-kuromoji@1.1.0/dist/kuroshiro-analyzer-kuromoji.min.js'
];
const DICT_PATH = 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/';
let enginePromise = null;

function isSectionHeading(line) {
  return /^(?:\[(?:verse|chorus|pre[- ]?chorus|bridge|intro|outro|refrain|interlude|hook)(?:[ :\d-]*)\]|【(?:Aメロ|Bメロ|サビ|間奏|イントロ|アウトロ)(?:[ \d]*)】)$/i.test(line);
}

async function getEngine() {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    importScripts(...SCRIPTS);
    const KuroshiroClass = self.Kuroshiro?.default || self.Kuroshiro;
    const AnalyzerClass = self.KuromojiAnalyzer?.default || self.KuromojiAnalyzer;
    if (!KuroshiroClass || !AnalyzerClass) throw new Error('日文轉換元件載入失敗');
    const engine = new KuroshiroClass();
    await engine.init(new AnalyzerClass({dictPath: DICT_PATH}));
    return engine;
  })();
  try { return await enginePromise; }
  catch (error) { enginePromise = null; throw error; }
}

self.onmessage = async event => {
  const {id, source} = event.data || {};
  if (!id || typeof source !== 'string') return;
  try {
    const engine = await getEngine();
    const output = [];
    for (const line of source.split('\n')) {
      if (!line || isSectionHeading(line)) output.push(line);
      else output.push(await engine.convert(line, {to: 'romaji', mode: 'normal', romajiSystem: 'hepburn'}));
    }
    self.postMessage({id, output: output.join('\n')});
  } catch (error) {
    self.postMessage({id, error: error?.message || '無法轉換日文歌詞'});
  }
};
