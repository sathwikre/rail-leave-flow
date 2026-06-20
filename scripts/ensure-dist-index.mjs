import fs from "fs";
import path from "path";

const distPath = path.join(process.cwd(), "dist");
const clientAssetsPath = path.join(distPath, "client", "assets");

const assets = fs.existsSync(clientAssetsPath) ? fs.readdirSync(clientAssetsPath) : [];
const entryScript = assets.find((file) => /^index-.*\.js$/.test(file));
const styleSheet = assets.find((file) => /^styles-.*\.css$/.test(file));

if (!entryScript) {
  throw new Error(`Could not find built client entry in ${clientAssetsPath}`);
}

const cssLink = styleSheet
  ? `    <link rel="stylesheet" crossorigin href="/client/assets/${styleSheet}">\n`
  : "";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Railway Station Leave Management System</title>
${cssLink}  </head>
  <body>
    <div id="root"></div>
    <script type="module" crossorigin src="/client/assets/${entryScript}"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(distPath, "index.html"), html);
console.log(fs.existsSync(path.join(distPath, "index.html")));
