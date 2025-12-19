// scripts/download-champions.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function downloadAllChampionIcons() {
  const version = "14.24.1";
  const outputDir = path.join(__dirname, "../assets/champions");

  // Créer le dossier s'il n'existe pasj
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Récupérer la liste des champions
  const { data } = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);

  const champions = Object.values(data.data);
  console.log(`Downloading ${champions.length} champion icons...`);

  for (const champ of champions) {
    const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.id}.png`;
    const outputPath = path.join(outputDir, `${champ.name}.png`);

    // Skip si déjà téléchargé
    if (fs.existsSync(outputPath)) {
      console.log(`✓ ${champ.name} (already exists)`);
      continue;
    }

    try {
      const response = await axios.get(iconUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(outputPath, response.data);
      console.log(`✓ ${champ.name}`);
    } catch (error) {
      console.error(`✗ ${champ.name}: ${error.message}`);
    }
  }

  console.log("Done!");
}

downloadAllChampionIcons();
