// scripts/download-objectives.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function downloadObjectiveIcons() {
  const outputDir = path.join(__dirname, "../../app/public/objectives");

  // Créer le dossier s'il n'existe pas
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const matchHistory = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-match-history/global/default";
  const minimap = "https://raw.communitydragon.org/latest/game/assets/ux/minimap/icons";

  // Liste des icônes d'objectifs avec leurs URLs CommunityDragon
  const objectives = [
    // Objectifs principaux (match history icons - 100 = bleu, 200 = rouge)
    { name: "tower", url: `${matchHistory}/tower-100.png` },
    { name: "dragon", url: `${matchHistory}/dragon-100.png` },
    { name: "baron", url: `${matchHistory}/baron-100.png` },
    { name: "herald", url: `${matchHistory}/herald-100.png` },
    { name: "inhibitor", url: `${matchHistory}/inhibitor-100.png` },

    // Dragons élémentaires
    { name: "dragon-infernal", url: `${matchHistory}/fire-100.png` },
    { name: "dragon-ocean", url: `${matchHistory}/water-100.png` },
    { name: "dragon-cloud", url: `${matchHistory}/air-100.png` },
    { name: "dragon-mountain", url: `${matchHistory}/earth-100.png` },
    { name: "dragon-elder", url: `${matchHistory}/elder-100.png` },

    // Grubs & Atakhan (minimap icons)
    { name: "grubs", url: `${minimap}/grub.png` },
    { name: "atakhan", url: `${minimap}/atakhan_r.png` },
  ];

  console.log(`Downloading ${objectives.length} objective icons...`);

  for (const obj of objectives) {
    const outputPath = path.join(outputDir, `${obj.name}.png`);

    // Skip si déjà téléchargé
    if (fs.existsSync(outputPath)) {
      console.log(`✓ ${obj.name} (already exists)`);
      continue;
    }

    try {
      const response = await axios.get(obj.url, { responseType: "arraybuffer" });
      fs.writeFileSync(outputPath, response.data);
      console.log(`✓ ${obj.name}`);
    } catch (error) {
      console.error(`✗ ${obj.name}: ${error.message}`);
    }
  }

  console.log("Done!");
}

downloadObjectiveIcons();
