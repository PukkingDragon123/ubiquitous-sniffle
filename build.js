// Bundles the game into a single self-contained HTML file: node build.js → dist/cheez-it.html
// (Three.js still loads from cdnjs; everything else is inlined.)
const fs = require('fs'), path = require('path');
const root = __dirname;
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const fontLink = (css.match(/@import url\('([^']+)'\);/) || [])[1];
css = css.replace(/@import url\('[^']+'\);\s*/, '');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1]
  .replace(/<script src="js\/([^"]+)"><\/script>/g, (m, f) => `<script>\n${fs.readFileSync(path.join(root, 'js', f), 'utf8')}\n</script>`);
const title = html.match(/<title>([^<]*)<\/title>/)[1];
const out = `<title>${title}</title>\n` +
  (fontLink ? `<link rel="stylesheet" href="${fontLink}">\n` : '') +
  `<style>\n${css}\n</style>\n${body}`;
const full = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${out}\n</body>\n</html>\n`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/cheez-it.html'), full);            // standalone, double-click to play
fs.writeFileSync(path.join(root, 'dist/cheez-it.fragment.html'), out);    // body-only fragment (for hosts that add their own skeleton)
console.log('built dist/cheez-it.html', (full.length / 1024).toFixed(0) + ' KB');
