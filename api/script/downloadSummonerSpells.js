// scripts/download-summoner-spells.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function downloadAllSummonerSpellIcons() {
  const version = "14.24.1";
  const outputDir = path.join(__dirname, "../../app/public/summoner-spells");

  // Créer le dossier s'il n'existe pas
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Récupérer la liste des summoner spells
  const { data } = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/summoner.json`);

  const spells = Object.values(data.data);
  console.log(`Downloading ${spells.length} summoner spell icons...`);

  for (const spell of spells) {
    const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell.image.full}`;
    const outputPath = path.join(outputDir, `${spell.key}.png`);

    // Skip si déjà téléchargé
    if (fs.existsSync(outputPath)) {
      console.log(`✓ ${spell.key} - ${spell.name} (already exists)`);
      continue;
    }

    try {
      const response = await axios.get(iconUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(outputPath, response.data);
      console.log(`✓ ${spell.key} - ${spell.name}`);
    } catch (error) {
      console.error(`✗ ${spell.key} - ${spell.name}: ${error.message}`);
    }
  }

  console.log("Done!");
}

downloadAllSummonerSpellIcons();
