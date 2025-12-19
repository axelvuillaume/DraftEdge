// scripts/create-reference-image.js
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

async function createReferenceImage() {
  const championsDir = path.join(__dirname, "../assets/champions");
  const files = fs.readdirSync(championsDir).filter((f) => f.endsWith(".png"));

  const iconSize = 48;
  const textWidth = 100;
  const itemWidth = iconSize + textWidth;
  const itemHeight = iconSize + 5;
  const cols = 6;
  const rows = Math.ceil(files.length / cols);

  const canvas = createCanvas(cols * itemWidth, rows * itemHeight);
  const ctx = canvas.getContext("2d");

  // Fond sombre
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px Arial";

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const champName = file.replace(".png", "");

    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * itemWidth;
    const y = row * itemHeight;

    try {
      const img = await loadImage(path.join(championsDir, file));
      ctx.drawImage(img, x, y, iconSize, iconSize);
      ctx.fillText(champName, x + iconSize + 5, y + 30);
    } catch (e) {
      console.error(`Error: ${champName}`, e.message);
    }
  }

  const outputPath = path.join(__dirname, "../assets/champions-reference.png");
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);

  console.log(`Reference image created: ${outputPath}`);
  console.log(`Size: ${canvas.width}x${canvas.height}`);
}

createReferenceImage();
