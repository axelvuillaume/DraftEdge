// scripts/download-runes.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Usage: node script/downloadRunes.js [--force]
// --force re-downloads icons that already exist (useful when Riot updates the artwork)
const force = process.argv.includes("--force");

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
    runes.push({ id: tree.id, name: tree.name, icon: `https://ddragon.leagueoflegends.com/cdn/img/${tree.icon}` });
    for (const slot of tree.slots) {
      for (const rune of slot.runes) {
        runes.push({ id: rune.id, name: rune.name, icon: `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}` });
      }
    }
  }

  // Stat perks (AD/AP adaptive, HP, armor, MR, attack speed, ability haste, etc.)
  // Pas dispo dans runesReforged.json, on utilise CommunityDragon
  const statPerksBase = "https://raw.communitydragon.org/latest/game/assets/perks/statmods";
  const statPerks = [
    { id: 5001, name: "Health Scaling", icon: `${statPerksBase}/statmodshealthscalingicon.png` },
    { id: 5002, name: "Armor", icon: `${statPerksBase}/statmodsarmoricon.png` },
    { id: 5003, name: "Magic Resist", icon: `${statPerksBase}/statmodsmagicresicon.png` },
    { id: 5005, name: "Attack Speed", icon: `${statPerksBase}/statmodsattackspeedicon.png` },
    { id: 5007, name: "Ability Haste", icon: `${statPerksBase}/statmodscdrscalingicon.png` },
    { id: 5008, name: "Adaptive Force", icon: `${statPerksBase}/statmodsadaptiveforceicon.png` },
    { id: 5010, name: "Move Speed", icon: `${statPerksBase}/statmodsmovementspeedicon.png` },
    { id: 5011, name: "Health", icon: `${statPerksBase}/statmodshealthplusicon.png` },
    { id: 5013, name: "Tenacity and Slow Resist", icon: `${statPerksBase}/statmodstenacityicon.png` },
  ];
  runes.push(...statPerks);

  console.log(`Downloading ${runes.length} rune icons...`);

  for (const rune of runes) {
    const iconUrl = rune.icon;
    const outputPath = path.join(outputDir, `${rune.id}.png`);

    // Skip si déjà téléchargé (sauf --force)
    if (!force && fs.existsSync(outputPath)) {
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
