// scripts/download-runes.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function downloadAllRuneIcons() {
  const { data: versions } = await axios.get("https://ddragon.leagueoflegends.com/api/versions.json");
  const version = versions[0];
  console.log(`Using DDragon version: ${version}`);
  const outputDir = path.join(__dirname, "../../app/public/runes");

  // Créer le dossier s'il n'existe pas
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Récupérer la liste des runes
  const { data: trees } = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`);

  // Collecter toutes les runes (arbres + runes individuelles)
  const runes = [];
  for (const tree of trees) {
    runes.push({ id: tree.id, name: tree.name, icon: tree.icon });
    for (const slot of tree.slots) {
      for (const rune of slot.runes) {
        runes.push({ id: rune.id, name: rune.name, icon: rune.icon });
      }
    }
  }

  console.log(`Downloading ${runes.length} rune icons...`);

  for (const rune of runes) {
    const iconUrl = `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`;
    const outputPath = path.join(outputDir, `${rune.id}.png`);

    // Skip si déjà téléchargé
    if (fs.existsSync(outputPath)) {
      console.log(`✓ ${rune.id} - ${rune.name} (already exists)`);
      continue;
    }

    try {
      const response = await axios.get(iconUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(outputPath, response.data);
      console.log(`✓ ${rune.id} - ${rune.name}`);
    } catch (error) {
      console.error(`✗ ${rune.id} - ${rune.name}: ${error.message}`);
    }
  }

  console.log("Done!");
}

downloadAllRuneIcons();
