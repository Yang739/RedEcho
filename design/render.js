const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'RedEcho-avatar.svg');
const svg = fs.readFileSync(svgPath);

const targets = [
  [1024, 'RedEcho-avatar-1024.png'],
  [512, 'RedEcho-avatar-512.png'],
  [144, 'RedEcho-avatar-144.png'],
];

(async () => {
  for (const [size, name] of targets) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, name));
    console.log('rendered', name, size + 'px');
  }
  console.log('done');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
