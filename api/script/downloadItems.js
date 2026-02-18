// scripts/download-items.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function downloadAllItemIcons() {
  const { data: versions } = await axios.get("https://ddragon.leagueoflegends.com/api/versions.json");
  const version = versions[0];
  console.log(`Using DDragon version: ${version}`);
  const outputDir = path.join(__dirname, "../../app/public/items");

  // Créer le dossier s'il n'existe pas
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Récupérer la liste des items
  const { data } = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`);

  const items = Object.entries(data.data);
  console.log(`Downloading ${items.length} item icons...`);

  for (const [itemCode, item] of items) {
    const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemCode}.png`;
    const outputPath = path.join(outputDir, `${itemCode}.png`);

    // Skip si déjà téléchargé
    if (fs.existsSync(outputPath)) {
      console.log(`✓ ${itemCode} - ${item.name} (already exists)`);
      continue;
    }

    try {
      const response = await axios.get(iconUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(outputPath, response.data);
      console.log(`✓ ${itemCode} - ${item.name}`);
    } catch (error) {
      console.error(`✗ ${itemCode} - ${item.name}: ${error.message}`);
    }
  }

  console.log("Done!");
}

downloadAllItemIcons();
