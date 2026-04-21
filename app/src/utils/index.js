// ==================== ROLES ====================

export const ROLES = ["top", "jungle", "mid", "bottom", "support"]

export const ROLE_LABELS = { top: "Top", jungle: "Jungle", mid: "Mid", bottom: "ADC", support: "Support" }

export const ROLE_ICON_COLORS = {
  top: "text-orange-400",
  jungle: "text-emerald-400",
  mid: "text-blue-400",
  bottom: "text-red-400",
  support: "text-cyan-400"
}

export const DRAFT_ROLES = ["TOP", "JGL", "MID", "ADC", "SUP"]

export const ROLE_ICONS = {
  TOP: "/roles/top.png",
  JGL: "/roles/jungle.png",
  MID: "/roles/mid.png",
  ADC: "/roles/bottom.png",
  SUP: "/roles/support.png"
}

export const POSITION_LABELS = ["First", "Second", "Third", "Fourth", "Fifth"]

// ==================== RANKED TIERS ====================

export const RANKED_TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"]

export const DIVS = { IV: 0, III: 1, II: 2, I: 3 }

export const TIER_COLORS = {
  IRON: "#6b7280",
  BRONZE: "#b45309",
  SILVER: "#9ca3af",
  GOLD: "#eab308",
  PLATINUM: "#06b6d4",
  EMERALD: "#10b981",
  DIAMOND: "#6366f1",
  MASTER: "#a855f7",
  GRANDMASTER: "#ef4444",
  CHALLENGER: "#f59e0b"
}

export const RANK_ICON_TIERS = new Set(["CHALLENGER", "GRANDMASTER", "MASTER", "DIAMOND", "PLATINUM", "EMERALD", "GOLD"])

export const TIER_SHORT = {
  IRON: "Iron",
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Plat",
  EMERALD: "Emerald",
  DIAMOND: "Dia",
  MASTER: "Master",
  GRANDMASTER: "GM",
  CHALLENGER: "Chall"
}

export const TIER_COLOR = {
  IRON: "text-slate-400",
  BRONZE: "text-amber-700",
  SILVER: "text-slate-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-cyan-300",
  EMERALD: "text-emerald-400",
  DIAMOND: "text-blue-400",
  MASTER: "text-purple-400",
  GRANDMASTER: "text-red-400",
  CHALLENGER: "text-amber-300"
}

// ==================== CHAMPION TIERS ====================

export const CHAMPION_TIERS = ["S", "A", "B"]

export const TIER_STYLES = {
  S: { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-400" },
  A: { bg: "bg-violet-500/15", border: "border-violet-500/40", text: "text-violet-400" },
  B: { bg: "bg-slate-500/15", border: "border-slate-500/40", text: "text-slate-400" }
}

export const TIER_ORDER = { S: 3, A: 2, B: 1 }

// ==================== CHAMPIONS ====================

export const ALL_CHAMPIONS = [
  "Aatrox",
  "Ahri",
  "Akali",
  "Akshan",
  "Alistar",
  "Ambessa",
  "Amumu",
  "Anivia",
  "Annie",
  "Aphelios",
  "Ashe",
  "AurelionSol",
  "Aurora",
  "Azir",
  "Bard",
  "BelVeth",
  "Blitzcrank",
  "Brand",
  "Braum",
  "Briar",
  "Caitlyn",
  "Camille",
  "Cassiopeia",
  "ChoGath",
  "Corki",
  "Darius",
  "Diana",
  "DrMundo",
  "Draven",
  "Ekko",
  "Elise",
  "Evelynn",
  "Ezreal",
  "FiddleSticks",
  "Fiora",
  "Fizz",
  "Galio",
  "Gangplank",
  "Garen",
  "Gnar",
  "Gragas",
  "Graves",
  "Gwen",
  "Hecarim",
  "Heimerdinger",
  "Hwei",
  "Illaoi",
  "Irelia",
  "Ivern",
  "Janna",
  "JarvanIV",
  "Jax",
  "Jayce",
  "Jhin",
  "Jinx",
  "KSante",
  "KaiSa",
  "Kalista",
  "Karma",
  "Karthus",
  "Kassadin",
  "Katarina",
  "Kayle",
  "Kayn",
  "Kennen",
  "KhaZix",
  "Kindred",
  "Kled",
  "KogMaw",
  "LeBlanc",
  "LeeSin",
  "Leona",
  "Lillia",
  "Lissandra",
  "Lucian",
  "Lulu",
  "Lux",
  "Malphite",
  "Malzahar",
  "Maokai",
  "MasterYi",
  "Milio",
  "MissFortune",
  "Mordekaiser",
  "Morgana",
  "Naafiri",
  "Nami",
  "Nasus",
  "Nautilus",
  "Neeko",
  "Nidalee",
  "Nilah",
  "Nocturne",
  "Nunu",
  "Olaf",
  "Orianna",
  "Ornn",
  "Pantheon",
  "Poppy",
  "Pyke",
  "Qiyana",
  "Quinn",
  "Rakan",
  "Rammus",
  "RekSai",
  "Rell",
  "RenataGlasc",
  "Renekton",
  "Rengar",
  "Riven",
  "Rumble",
  "Ryze",
  "Samira",
  "Sejuani",
  "Senna",
  "Seraphine",
  "Sett",
  "Shaco",
  "Shen",
  "Shyvana",
  "Singed",
  "Sion",
  "Sivir",
  "Skarner",
  "Smolder",
  "Sona",
  "Soraka",
  "Swain",
  "Sylas",
  "Syndra",
  "TahmKench",
  "Taliyah",
  "Talon",
  "Taric",
  "Teemo",
  "Thresh",
  "Tristana",
  "Trundle",
  "Tryndamere",
  "TwistedFate",
  "Twitch",
  "Udyr",
  "Urgot",
  "Varus",
  "Vayne",
  "Veigar",
  "VelKoz",
  "Vex",
  "Vi",
  "Viego",
  "Viktor",
  "Vladimir",
  "Volibear",
  "Warwick",
  "Wukong",
  "Xayah",
  "Xerath",
  "XinZhao",
  "Yasuo",
  "Yone",
  "Yorick",
  "Yuumi",
  "Yunara",
  "Zac",
  "Zed",
  "Zeri",
  "Ziggs",
  "Zilean",
  "Zoe",
  "Zyra",
  "Zaahen"
]

export const CHAMPIONS_BY_ROLE = {
  TOP: [
    "Aatrox",
    "Ambessa",
    "Camille",
    "ChoGath",
    "Darius",
    "DrMundo",
    "Fiora",
    "Gangplank",
    "Garen",
    "Gnar",
    "Gragas",
    "Gwen",
    "Illaoi",
    "Irelia",
    "Jax",
    "Jayce",
    "Kennen",
    "Kled",
    "KSante",
    "Malphite",
    "Mordekaiser",
    "Nasus",
    "Olaf",
    "Ornn",
    "Pantheon",
    "Poppy",
    "Quinn",
    "Renekton",
    "Riven",
    "Rumble",
    "Sett",
    "Shen",
    "Singed",
    "Sion",
    "Teemo",
    "Tryndamere",
    "Urgot",
    "Volibear",
    "Wukong",
    "Yorick"
  ],
  JGL: [
    "Amumu",
    "BelVeth",
    "Briar",
    "Diana",
    "Ekko",
    "Elise",
    "Evelynn",
    "Fiddlesticks",
    "Graves",
    "Hecarim",
    "Ivern",
    "JarvanIV",
    "Kayn",
    "KhaZix",
    "Kindred",
    "LeeSin",
    "Lillia",
    "MasterYi",
    "Nidalee",
    "Nocturne",
    "Nunu",
    "Olaf",
    "RekSai",
    "Rengar",
    "Sejuani",
    "Shaco",
    "Shyvana",
    "Skarner",
    "Taliyah",
    "Udyr",
    "Vi",
    "Viego",
    "Volibear",
    "Warwick",
    "Wukong",
    "XinZhao",
    "Zac"
  ],
  MID: [
    "Ahri",
    "Akali",
    "Anivia",
    "Annie",
    "AurelionSol",
    "Aurora",
    "Azir",
    "Cassiopeia",
    "Corki",
    "Diana",
    "Ekko",
    "Fizz",
    "Galio",
    "Hwei",
    "Irelia",
    "Kassadin",
    "Katarina",
    "LeBlanc",
    "Lissandra",
    "Lux",
    "Malzahar",
    "Naafiri",
    "Neeko",
    "Orianna",
    "Qiyana",
    "Ryze",
    "Syndra",
    "Sylas",
    "Talon",
    "TwistedFate",
    "Veigar",
    "Vex",
    "Viktor",
    "Vladimir",
    "Xerath",
    "Yasuo",
    "Yone",
    "Zed",
    "Ziggs",
    "Zoe"
  ],
  ADC: [
    "Aphelios",
    "Ashe",
    "Caitlyn",
    "Draven",
    "Ezreal",
    "Jhin",
    "Jinx",
    "Kaisa",
    "Kalista",
    "KogMaw",
    "Lucian",
    "MissFortune",
    "Nilah",
    "Samira",
    "Sivir",
    "Smolder",
    "Tristana",
    "Twitch",
    "Varus",
    "Vayne",
    "Xayah",
    "Zeri",
    "Yunara"
  ],
  SUP: [
    "Alistar",
    "Bard",
    "Blitzcrank",
    "Braum",
    "Janna",
    "Karma",
    "Leona",
    "Lulu",
    "Maokai",
    "Milio",
    "Morgana",
    "Nami",
    "Nautilus",
    "Poppy",
    "Pyke",
    "Rakan",
    "Rell",
    "RenataGlasc",
    "Senna",
    "Seraphine",
    "Sona",
    "Soraka",
    "TahmKench",
    "Taric",
    "Thresh",
    "Yuumi",
    "Zyra"
  ]
}

// ==================== MISC ====================

export const CHART_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#a855f7"]

export const SERVERS = [
  { value: "euw1", label: "EUW" },
  { value: "eun1", label: "EUNE" },
  { value: "na1", label: "NA" },
  { value: "kr", label: "KR" },
  { value: "br1", label: "BR" },
  { value: "jp1", label: "JP" },
  { value: "la1", label: "LAN" },
  { value: "la2", label: "LAS" },
  { value: "oc1", label: "OCE" },
  { value: "tr1", label: "TR" },
  { value: "ru", label: "RU" },
  { value: "ph2", label: "PH" },
  { value: "sg2", label: "SG" },
  { value: "th2", label: "TH" },
  { value: "tw2", label: "TW" },
  { value: "vn2", label: "VN" },
  { value: "me1", label: "ME" }
]

// ==================== HELPERS ====================

/** Format a date to YYYY-MM-DD.
 * @param {string} isoDateString - The ISO date string
 * @returns {string} - The formatted date
 * @example
 * formatDateToYYYYMMDD('2021-01-01T00:00:00.000Z') // '2021-01-01'
 */
export function formatDateToYYYYMMDD(isoDateString) {
  const date = new Date(isoDateString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const formattedMonth = month < 10 ? `0${month}` : month
  const formattedDay = day < 10 ? `0${day}` : day
  return `${year}-${formattedMonth}-${formattedDay}`
}

export function getChampionIcon(name) {
  if (!name) return ""
  return `/icon/champions/${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.png`
}

export function getItemIcon(id) {
  if (!id) return ""
  return `/items/${id}.png`
}

export function getSummonerSpellIcon(id) {
  if (!id) return ""
  return `/summoner-spells/${id}.png`
}

export function getRuneIcon(id) {
  if (!id) return ""
  return `/runes/${id}.png`
}
