import { useState } from "react"
import { PatternIcon, ObjectivesIcon, ScalingIcon, CombatIcon } from "@/components/icons/performance-icons"

export default function StatsV2() {
  const [activePlayer, setActivePlayer] = useState(null)
  const [activeChampion, setActiveChampion] = useState(null)
  const [activeCategory, setActiveCategory] = useState("Combat")

  const categories = [
    { id: "Combat", icon: CombatIcon, color: "#3b82f6" },
    { id: "Objectives", icon: ObjectivesIcon, color: "#f97316" },
    { id: "Vision", icon: PatternIcon, color: "#0ea5e9" },
    { id: "Income", icon: ScalingIcon, color: "#a855f7" }
  ]

  const teamData = {
    name: "Team",
    score: 78,
    winRate: 52.4,
    games: 1247,
    categoryScores: { Combat: 82, Objectives: 71, Vision: 68, Income: 85 },
    metrics: {
      Combat: [
        { name: "DMG / min", team: 788.5, enemies: 766, diff: 2.9 },
        { name: "Kills / game", team: 5.9, enemies: 5.7, diff: 3.5 },
        { name: "Deaths / game", team: 5.7, enemies: 5.9, diff: -3.4 },
        { name: "Kill Participation", team: 27.3, enemies: 27.4, diff: -0.4 },
        { name: "DMG / Gold", team: 1.79, enemies: 1.8, diff: -0.6 }
      ],
      Objectives: [
        { name: "Dragons / game", team: 2.4, enemies: 2.1, diff: 14.3 },
        { name: "Heralds / game", team: 1.1, enemies: 0.9, diff: 22.2 },
        { name: "Barons / game", team: 0.8, enemies: 0.7, diff: 14.3 },
        { name: "Towers / game", team: 6.2, enemies: 5.8, diff: 6.9 },
        { name: "First Dragon %", team: 58, enemies: 42, diff: 38.1 }
      ],
      Vision: [
        { name: "Wards / min", team: 1.2, enemies: 1.1, diff: 9.1 },
        { name: "Control Wards", team: 3.8, enemies: 3.2, diff: 18.8 },
        { name: "Wards Cleared", team: 8.2, enemies: 7.5, diff: 9.3 },
        { name: "Vision Score", team: 42.5, enemies: 38.2, diff: 11.3 },
        { name: "Vision Score / min", team: 1.4, enemies: 1.2, diff: 16.7 }
      ],
      Income: [
        { name: "Gold / min", team: 425, enemies: 412, diff: 3.2 },
        { name: "CS / min", team: 7.8, enemies: 7.5, diff: 4.0 },
        { name: "Gold @ 15", team: 6250, enemies: 6100, diff: 2.5 },
        { name: "CS @ 15", team: 142, enemies: 138, diff: 2.9 },
        { name: "Gold Diff @ 15", team: 450, enemies: -450, diff: 100 }
      ]
    },
    winRateBySide: { blue: 75, red: 50 },
    winRateByDuration: [
      { label: "-20", value: 50 },
      { label: "20-25", value: 0 },
      { label: "25-30", value: 65 },
      { label: "30-35", value: 70 },
      { label: "35+", value: 100 }
    ],
    players: [
      {
        name: "Player1",
        role: "Top",
        score: 82,
        winRate: 55.2,
        games: 312,
        metrics: [
          { name: "DMG / min", team: 650, enemies: 620, diff: 4.8 },
          { name: "Kills / game", team: 4.2, enemies: 3.8, diff: 10.5 },
          { name: "Deaths / game", team: 3.1, enemies: 3.5, diff: 11.4 },
          { name: "Kill Participation", team: 45.2, enemies: 42.1, diff: 7.4 },
          { name: "DMG / Gold", team: 1.65, enemies: 1.58, diff: 4.4 }
        ],
        winRateBySide: { blue: 58, red: 52 },
        winRateByDuration: [
          { label: "-20", value: 60 },
          { label: "20-25", value: 55 },
          { label: "25-30", value: 54 },
          { label: "30-35", value: 52 },
          { label: "35+", value: 58 }
        ],
        weakAgainst: [
          {
            name: "Darius",
            diff: -8.2,
            score: 42,
            winRate: 38.5,
            games: 26,
            metrics: [
              { name: "DMG / min", team: 580, enemies: 720, diff: -19.4 },
              { name: "Kills / game", team: 2.8, enemies: 5.2, diff: -46.2 },
              { name: "Deaths / game", team: 4.5, enemies: 2.1, diff: -114.3 },
              { name: "Kill Participation", team: 38.2, enemies: 52.1, diff: -26.7 },
              { name: "DMG / Gold", team: 1.42, enemies: 1.78, diff: -20.2 }
            ],
            winRateBySide: { blue: 42, red: 35 },
            winRateByDuration: [
              { label: "-20", value: 30 },
              { label: "20-25", value: 35 },
              { label: "25-30", value: 40 },
              { label: "30-35", value: 45 },
              { label: "35+", value: 50 }
            ]
          },
          {
            name: "Garen",
            diff: -5.1,
            score: 48,
            winRate: 44.2,
            games: 18,
            metrics: [
              { name: "DMG / min", team: 610, enemies: 680, diff: -10.3 },
              { name: "Kills / game", team: 3.2, enemies: 4.5, diff: -28.9 },
              { name: "Deaths / game", team: 3.8, enemies: 2.8, diff: -35.7 },
              { name: "Kill Participation", team: 42.1, enemies: 48.5, diff: -13.2 },
              { name: "DMG / Gold", team: 1.52, enemies: 1.68, diff: -9.5 }
            ],
            winRateBySide: { blue: 48, red: 40 },
            winRateByDuration: [
              { label: "-20", value: 38 },
              { label: "20-25", value: 42 },
              { label: "25-30", value: 45 },
              { label: "30-35", value: 48 },
              { label: "35+", value: 52 }
            ]
          },
          {
            name: "Mordekaiser",
            diff: -3.8,
            score: 52,
            winRate: 46.8,
            games: 22,
            metrics: [
              { name: "DMG / min", team: 625, enemies: 665, diff: -6.0 },
              { name: "Kills / game", team: 3.5, enemies: 4.1, diff: -14.6 },
              { name: "Deaths / game", team: 3.4, enemies: 3.0, diff: -13.3 },
              { name: "Kill Participation", team: 44.5, enemies: 47.2, diff: -5.7 },
              { name: "DMG / Gold", team: 1.58, enemies: 1.65, diff: -4.2 }
            ],
            winRateBySide: { blue: 50, red: 44 },
            winRateByDuration: [
              { label: "-20", value: 42 },
              { label: "20-25", value: 45 },
              { label: "25-30", value: 48 },
              { label: "30-35", value: 50 },
              { label: "35+", value: 52 }
            ]
          }
        ],
        strongAgainst: [
          {
            name: "Teemo",
            diff: 12.4,
            score: 85,
            winRate: 68.5,
            games: 32,
            metrics: [
              { name: "DMG / min", team: 720, enemies: 540, diff: 33.3 },
              { name: "Kills / game", team: 5.8, enemies: 2.4, diff: 141.7 },
              { name: "Deaths / game", team: 2.2, enemies: 4.8, diff: 54.2 },
              { name: "Kill Participation", team: 52.4, enemies: 35.2, diff: 48.9 },
              { name: "DMG / Gold", team: 1.82, enemies: 1.38, diff: 31.9 }
            ],
            winRateBySide: { blue: 72, red: 65 },
            winRateByDuration: [
              { label: "-20", value: 75 },
              { label: "20-25", value: 70 },
              { label: "25-30", value: 68 },
              { label: "30-35", value: 65 },
              { label: "35+", value: 62 }
            ]
          },
          {
            name: "Vayne",
            diff: 8.7,
            score: 78,
            winRate: 62.1,
            games: 28,
            metrics: [
              { name: "DMG / min", team: 695, enemies: 580, diff: 19.8 },
              { name: "Kills / game", team: 5.2, enemies: 3.1, diff: 67.7 },
              { name: "Deaths / game", team: 2.6, enemies: 4.2, diff: 38.1 },
              { name: "Kill Participation", team: 50.2, enemies: 38.5, diff: 30.4 },
              { name: "DMG / Gold", team: 1.75, enemies: 1.48, diff: 18.2 }
            ],
            winRateBySide: { blue: 65, red: 58 },
            winRateByDuration: [
              { label: "-20", value: 68 },
              { label: "20-25", value: 64 },
              { label: "25-30", value: 62 },
              { label: "30-35", value: 58 },
              { label: "35+", value: 55 }
            ]
          },
          {
            name: "Quinn",
            diff: 6.2,
            score: 72,
            winRate: 58.4,
            games: 24,
            metrics: [
              { name: "DMG / min", team: 680, enemies: 605, diff: 12.4 },
              { name: "Kills / game", team: 4.8, enemies: 3.5, diff: 37.1 },
              { name: "Deaths / game", team: 2.9, enemies: 3.8, diff: 23.7 },
              { name: "Kill Participation", team: 48.5, enemies: 40.2, diff: 20.6 },
              { name: "DMG / Gold", team: 1.7, enemies: 1.52, diff: 11.8 }
            ],
            winRateBySide: { blue: 62, red: 55 },
            winRateByDuration: [
              { label: "-20", value: 62 },
              { label: "20-25", value: 60 },
              { label: "25-30", value: 58 },
              { label: "30-35", value: 55 },
              { label: "35+", value: 52 }
            ]
          }
        ]
      },
      {
        name: "Player2",
        role: "Jungle",
        score: 75,
        winRate: 51.8,
        games: 298,
        metrics: [
          { name: "DMG / min", team: 520, enemies: 540, diff: -3.7 },
          { name: "Kills / game", team: 5.8, enemies: 5.2, diff: 11.5 },
          { name: "Deaths / game", team: 4.2, enemies: 4.0, diff: -5.0 },
          { name: "Kill Participation", team: 62.1, enemies: 58.4, diff: 6.3 },
          { name: "DMG / Gold", team: 1.42, enemies: 1.48, diff: -4.1 }
        ],
        winRateBySide: { blue: 54, red: 49 },
        winRateByDuration: [
          { label: "-20", value: 48 },
          { label: "20-25", value: 52 },
          { label: "25-30", value: 55 },
          { label: "30-35", value: 50 },
          { label: "35+", value: 45 }
        ],
        weakAgainst: [
          {
            name: "Lee Sin",
            diff: -6.5,
            score: 45,
            winRate: 42.1,
            games: 38,
            metrics: [
              { name: "DMG / min", team: 480, enemies: 580, diff: -17.2 },
              { name: "Kills / game", team: 4.2, enemies: 6.1, diff: -31.1 },
              { name: "Deaths / game", team: 5.1, enemies: 3.2, diff: -59.4 },
              { name: "Kill Participation", team: 55.2, enemies: 65.4, diff: -15.6 },
              { name: "DMG / Gold", team: 1.32, enemies: 1.58, diff: -16.5 }
            ],
            winRateBySide: { blue: 45, red: 39 },
            winRateByDuration: [
              { label: "-20", value: 35 },
              { label: "20-25", value: 40 },
              { label: "25-30", value: 45 },
              { label: "30-35", value: 48 },
              { label: "35+", value: 50 }
            ]
          },
          {
            name: "Elise",
            diff: -4.2,
            score: 50,
            winRate: 45.8,
            games: 24,
            metrics: [
              { name: "DMG / min", team: 495, enemies: 555, diff: -10.8 },
              { name: "Kills / game", team: 4.8, enemies: 5.6, diff: -14.3 },
              { name: "Deaths / game", team: 4.5, enemies: 3.6, diff: -25.0 },
              { name: "Kill Participation", team: 58.4, enemies: 62.1, diff: -6.0 },
              { name: "DMG / Gold", team: 1.38, enemies: 1.52, diff: -9.2 }
            ],
            winRateBySide: { blue: 48, red: 43 },
            winRateByDuration: [
              { label: "-20", value: 40 },
              { label: "20-25", value: 44 },
              { label: "25-30", value: 48 },
              { label: "30-35", value: 50 },
              { label: "35+", value: 52 }
            ]
          },
          {
            name: "Nidalee",
            diff: -3.1,
            score: 52,
            winRate: 47.2,
            games: 18,
            metrics: [
              { name: "DMG / min", team: 505, enemies: 545, diff: -7.3 },
              { name: "Kills / game", team: 5.1, enemies: 5.5, diff: -7.3 },
              { name: "Deaths / game", team: 4.3, enemies: 3.8, diff: -13.2 },
              { name: "Kill Participation", team: 60.2, enemies: 63.5, diff: -5.2 },
              { name: "DMG / Gold", team: 1.4, enemies: 1.5, diff: -6.7 }
            ],
            winRateBySide: { blue: 50, red: 44 },
            winRateByDuration: [
              { label: "-20", value: 42 },
              { label: "20-25", value: 46 },
              { label: "25-30", value: 50 },
              { label: "30-35", value: 52 },
              { label: "35+", value: 48 }
            ]
          }
        ],
        strongAgainst: [
          {
            name: "Amumu",
            diff: 9.8,
            score: 82,
            winRate: 65.4,
            games: 26,
            metrics: [
              { name: "DMG / min", team: 580, enemies: 480, diff: 20.8 },
              { name: "Kills / game", team: 6.8, enemies: 4.2, diff: 61.9 },
              { name: "Deaths / game", team: 3.5, enemies: 5.2, diff: 32.7 },
              { name: "Kill Participation", team: 68.4, enemies: 52.1, diff: 31.3 },
              { name: "DMG / Gold", team: 1.55, enemies: 1.32, diff: 17.4 }
            ],
            winRateBySide: { blue: 68, red: 62 },
            winRateByDuration: [
              { label: "-20", value: 70 },
              { label: "20-25", value: 68 },
              { label: "25-30", value: 65 },
              { label: "30-35", value: 62 },
              { label: "35+", value: 58 }
            ]
          },
          {
            name: "Master Yi",
            diff: 7.2,
            score: 76,
            winRate: 60.2,
            games: 30,
            metrics: [
              { name: "DMG / min", team: 560, enemies: 495, diff: 13.1 },
              { name: "Kills / game", team: 6.2, enemies: 4.8, diff: 29.2 },
              { name: "Deaths / game", team: 3.8, enemies: 4.8, diff: 20.8 },
              { name: "Kill Participation", team: 65.8, enemies: 55.2, diff: 19.2 },
              { name: "DMG / Gold", team: 1.5, enemies: 1.38, diff: 8.7 }
            ],
            winRateBySide: { blue: 64, red: 56 },
            winRateByDuration: [
              { label: "-20", value: 65 },
              { label: "20-25", value: 62 },
              { label: "25-30", value: 60 },
              { label: "30-35", value: 58 },
              { label: "35+", value: 55 }
            ]
          },
          {
            name: "Shyvana",
            diff: 5.5,
            score: 70,
            winRate: 57.8,
            games: 22,
            metrics: [
              { name: "DMG / min", team: 545, enemies: 505, diff: 7.9 },
              { name: "Kills / game", team: 5.8, enemies: 5.0, diff: 16.0 },
              { name: "Deaths / game", team: 4.0, enemies: 4.5, diff: 11.1 },
              { name: "Kill Participation", team: 64.2, enemies: 57.8, diff: 11.1 },
              { name: "DMG / Gold", team: 1.46, enemies: 1.4, diff: 4.3 }
            ],
            winRateBySide: { blue: 60, red: 55 },
            winRateByDuration: [
              { label: "-20", value: 62 },
              { label: "20-25", value: 60 },
              { label: "25-30", value: 58 },
              { label: "30-35", value: 55 },
              { label: "35+", value: 52 }
            ]
          }
        ]
      },
      {
        name: "Player3",
        role: "Mid",
        score: 88,
        winRate: 58.4,
        games: 356,
        metrics: [
          { name: "DMG / min", team: 920, enemies: 850, diff: 8.2 },
          { name: "Kills / game", team: 7.2, enemies: 6.1, diff: 18.0 },
          { name: "Deaths / game", team: 2.8, enemies: 3.2, diff: 12.5 },
          { name: "Kill Participation", team: 58.4, enemies: 52.1, diff: 12.1 },
          { name: "DMG / Gold", team: 1.92, enemies: 1.78, diff: 7.9 }
        ],
        winRateBySide: { blue: 62, red: 54 },
        winRateByDuration: [
          { label: "-20", value: 65 },
          { label: "20-25", value: 62 },
          { label: "25-30", value: 58 },
          { label: "30-35", value: 55 },
          { label: "35+", value: 52 }
        ],
        weakAgainst: [
          {
            name: "Kassadin",
            diff: -5.8,
            score: 48,
            winRate: 44.5,
            games: 28,
            metrics: [
              { name: "DMG / min", team: 820, enemies: 920, diff: -10.9 },
              { name: "Kills / game", team: 5.5, enemies: 7.2, diff: -23.6 },
              { name: "Deaths / game", team: 3.8, enemies: 2.5, diff: -52.0 },
              { name: "Kill Participation", team: 52.1, enemies: 62.4, diff: -16.5 },
              { name: "DMG / Gold", team: 1.75, enemies: 1.95, diff: -10.3 }
            ],
            winRateBySide: { blue: 48, red: 41 },
            winRateByDuration: [
              { label: "-20", value: 55 },
              { label: "20-25", value: 48 },
              { label: "25-30", value: 42 },
              { label: "30-35", value: 38 },
              { label: "35+", value: 35 }
            ]
          },
          {
            name: "Fizz",
            diff: -4.1,
            score: 52,
            winRate: 47.2,
            games: 22,
            metrics: [
              { name: "DMG / min", team: 850, enemies: 895, diff: -5.0 },
              { name: "Kills / game", team: 6.0, enemies: 6.8, diff: -11.8 },
              { name: "Deaths / game", team: 3.4, enemies: 2.8, diff: -21.4 },
              { name: "Kill Participation", team: 54.5, enemies: 58.2, diff: -6.4 },
              { name: "DMG / Gold", team: 1.82, enemies: 1.9, diff: -4.2 }
            ],
            winRateBySide: { blue: 50, red: 44 },
            winRateByDuration: [
              { label: "-20", value: 52 },
              { label: "20-25", value: 48 },
              { label: "25-30", value: 46 },
              { label: "30-35", value: 45 },
              { label: "35+", value: 48 }
            ]
          },
          {
            name: "Zed",
            diff: -2.9,
            score: 55,
            winRate: 49.8,
            games: 32,
            metrics: [
              { name: "DMG / min", team: 875, enemies: 905, diff: -3.3 },
              { name: "Kills / game", team: 6.5, enemies: 7.0, diff: -7.1 },
              { name: "Deaths / game", team: 3.2, enemies: 2.9, diff: -10.3 },
              { name: "Kill Participation", team: 56.2, enemies: 58.8, diff: -4.4 },
              { name: "DMG / Gold", team: 1.85, enemies: 1.88, diff: -1.6 }
            ],
            winRateBySide: { blue: 52, red: 48 },
            winRateByDuration: [
              { label: "-20", value: 48 },
              { label: "20-25", value: 50 },
              { label: "25-30", value: 52 },
              { label: "30-35", value: 50 },
              { label: "35+", value: 48 }
            ]
          }
        ],
        strongAgainst: [
          {
            name: "Lux",
            diff: 14.2,
            score: 92,
            winRate: 72.5,
            games: 40,
            metrics: [
              { name: "DMG / min", team: 1020, enemies: 780, diff: 30.8 },
              { name: "Kills / game", team: 8.5, enemies: 4.2, diff: 102.4 },
              { name: "Deaths / game", team: 2.2, enemies: 4.5, diff: 51.1 },
              { name: "Kill Participation", team: 65.4, enemies: 45.2, diff: 44.7 },
              { name: "DMG / Gold", team: 2.05, enemies: 1.62, diff: 26.5 }
            ],
            winRateBySide: { blue: 75, red: 70 },
            winRateByDuration: [
              { label: "-20", value: 78 },
              { label: "20-25", value: 75 },
              { label: "25-30", value: 72 },
              { label: "30-35", value: 68 },
              { label: "35+", value: 65 }
            ]
          },
          {
            name: "Veigar",
            diff: 11.5,
            score: 88,
            winRate: 68.2,
            games: 35,
            metrics: [
              { name: "DMG / min", team: 980, enemies: 820, diff: 19.5 },
              { name: "Kills / game", team: 7.8, enemies: 4.8, diff: 62.5 },
              { name: "Deaths / game", team: 2.5, enemies: 4.2, diff: 40.5 },
              { name: "Kill Participation", team: 62.8, enemies: 48.5, diff: 29.5 },
              { name: "DMG / Gold", team: 2.0, enemies: 1.68, diff: 19.0 }
            ],
            winRateBySide: { blue: 72, red: 65 },
            winRateByDuration: [
              { label: "-20", value: 75 },
              { label: "20-25", value: 70 },
              { label: "25-30", value: 68 },
              { label: "30-35", value: 65 },
              { label: "35+", value: 60 }
            ]
          },
          {
            name: "Xerath",
            diff: 8.8,
            score: 82,
            winRate: 64.5,
            games: 28,
            metrics: [
              { name: "DMG / min", team: 955, enemies: 845, diff: 13.0 },
              { name: "Kills / game", team: 7.4, enemies: 5.2, diff: 42.3 },
              { name: "Deaths / game", team: 2.8, enemies: 3.8, diff: 26.3 },
              { name: "Kill Participation", team: 60.5, enemies: 50.2, diff: 20.5 },
              { name: "DMG / Gold", team: 1.95, enemies: 1.72, diff: 13.4 }
            ],
            winRateBySide: { blue: 68, red: 61 },
            winRateByDuration: [
              { label: "-20", value: 70 },
              { label: "20-25", value: 66 },
              { label: "25-30", value: 64 },
              { label: "30-35", value: 62 },
              { label: "35+", value: 58 }
            ]
          }
        ]
      },
      {
        name: "Player4",
        role: "ADC",
        score: 71,
        winRate: 49.2,
        games: 287,
        metrics: [
          { name: "DMG / min", team: 780, enemies: 810, diff: -3.7 },
          { name: "Kills / game", team: 6.1, enemies: 6.5, diff: -6.2 },
          { name: "Deaths / game", team: 4.8, enemies: 4.2, diff: -14.3 },
          { name: "Kill Participation", team: 52.3, enemies: 54.8, diff: -4.6 },
          { name: "DMG / Gold", team: 1.68, enemies: 1.75, diff: -4.0 }
        ],
        winRateBySide: { blue: 52, red: 46 },
        winRateByDuration: [
          { label: "-20", value: 42 },
          { label: "20-25", value: 48 },
          { label: "25-30", value: 52 },
          { label: "30-35", value: 55 },
          { label: "35+", value: 58 }
        ],
        weakAgainst: [
          {
            name: "Draven",
            diff: -9.4,
            score: 38,
            winRate: 35.2,
            games: 22,
            metrics: [
              { name: "DMG / min", team: 680, enemies: 920, diff: -26.1 },
              { name: "Kills / game", team: 4.2, enemies: 8.5, diff: -50.6 },
              { name: "Deaths / game", team: 6.2, enemies: 3.1, diff: -100.0 },
              { name: "Kill Participation", team: 45.2, enemies: 62.4, diff: -27.6 },
              { name: "DMG / Gold", team: 1.52, enemies: 1.92, diff: -20.8 }
            ],
            winRateBySide: { blue: 38, red: 32 },
            winRateByDuration: [
              { label: "-20", value: 28 },
              { label: "20-25", value: 32 },
              { label: "25-30", value: 38 },
              { label: "30-35", value: 42 },
              { label: "35+", value: 45 }
            ]
          },
          {
            name: "Lucian",
            diff: -6.2,
            score: 45,
            winRate: 41.5,
            games: 28,
            metrics: [
              { name: "DMG / min", team: 720, enemies: 850, diff: -15.3 },
              { name: "Kills / game", team: 5.0, enemies: 7.2, diff: -30.6 },
              { name: "Deaths / game", team: 5.5, enemies: 3.8, diff: -44.7 },
              { name: "Kill Participation", team: 48.5, enemies: 58.2, diff: -16.7 },
              { name: "DMG / Gold", team: 1.58, enemies: 1.82, diff: -13.2 }
            ],
            winRateBySide: { blue: 44, red: 39 },
            winRateByDuration: [
              { label: "-20", value: 35 },
              { label: "20-25", value: 40 },
              { label: "25-30", value: 44 },
              { label: "30-35", value: 46 },
              { label: "35+", value: 48 }
            ]
          },
          {
            name: "Caitlyn",
            diff: -4.8,
            score: 48,
            winRate: 44.2,
            games: 32,
            metrics: [
              { name: "DMG / min", team: 745, enemies: 825, diff: -9.7 },
              { name: "Kills / game", team: 5.4, enemies: 6.8, diff: -20.6 },
              { name: "Deaths / game", team: 5.2, enemies: 4.0, diff: -30.0 },
              { name: "Kill Participation", team: 50.2, enemies: 56.5, diff: -11.2 },
              { name: "DMG / Gold", team: 1.62, enemies: 1.78, diff: -9.0 }
            ],
            winRateBySide: { blue: 48, red: 40 },
            winRateByDuration: [
              { label: "-20", value: 38 },
              { label: "20-25", value: 42 },
              { label: "25-30", value: 46 },
              { label: "30-35", value: 48 },
              { label: "35+", value: 50 }
            ]
          }
        ],
        strongAgainst: [
          {
            name: "Kog'Maw",
            diff: 8.5,
            score: 78,
            winRate: 62.5,
            games: 24,
            metrics: [
              { name: "DMG / min", team: 865, enemies: 720, diff: 20.1 },
              { name: "Kills / game", team: 7.2, enemies: 4.5, diff: 60.0 },
              { name: "Deaths / game", team: 3.8, enemies: 5.5, diff: 30.9 },
              { name: "Kill Participation", team: 58.4, enemies: 45.2, diff: 29.2 },
              { name: "DMG / Gold", team: 1.82, enemies: 1.55, diff: 17.4 }
            ],
            winRateBySide: { blue: 65, red: 60 },
            winRateByDuration: [
              { label: "-20", value: 68 },
              { label: "20-25", value: 65 },
              { label: "25-30", value: 62 },
              { label: "30-35", value: 58 },
              { label: "35+", value: 55 }
            ]
          },
          {
            name: "Twitch",
            diff: 6.2,
            score: 72,
            winRate: 58.4,
            games: 20,
            metrics: [
              { name: "DMG / min", team: 840, enemies: 745, diff: 12.8 },
              { name: "Kills / game", team: 6.8, enemies: 5.0, diff: 36.0 },
              { name: "Deaths / game", team: 4.2, enemies: 5.2, diff: 19.2 },
              { name: "Kill Participation", team: 56.2, enemies: 48.5, diff: 15.9 },
              { name: "DMG / Gold", team: 1.78, enemies: 1.6, diff: 11.3 }
            ],
            winRateBySide: { blue: 62, red: 55 },
            winRateByDuration: [
              { label: "-20", value: 64 },
              { label: "20-25", value: 60 },
              { label: "25-30", value: 58 },
              { label: "30-35", value: 55 },
              { label: "35+", value: 52 }
            ]
          },
          {
            name: "Aphelios",
            diff: 4.1,
            score: 68,
            winRate: 55.2,
            games: 26,
            metrics: [
              { name: "DMG / min", team: 820, enemies: 765, diff: 7.2 },
              { name: "Kills / game", team: 6.5, enemies: 5.5, diff: 18.2 },
              { name: "Deaths / game", team: 4.5, enemies: 5.0, diff: 10.0 },
              { name: "Kill Participation", team: 54.8, enemies: 50.2, diff: 9.2 },
              { name: "DMG / Gold", team: 1.75, enemies: 1.65, diff: 6.1 }
            ],
            winRateBySide: { blue: 58, red: 52 },
            winRateByDuration: [
              { label: "-20", value: 58 },
              { label: "20-25", value: 56 },
              { label: "25-30", value: 55 },
              { label: "30-35", value: 54 },
              { label: "35+", value: 52 }
            ]
          }
        ]
      },
      {
        name: "Player5",
        role: "Support",
        score: 79,
        winRate: 53.1,
        games: 324,
        metrics: [
          { name: "DMG / min", team: 280, enemies: 260, diff: 7.7 },
          { name: "Kills / game", team: 1.2, enemies: 1.0, diff: 20.0 },
          { name: "Deaths / game", team: 3.8, enemies: 4.1, diff: 7.3 },
          { name: "Kill Participation", team: 72.4, enemies: 68.2, diff: 6.2 },
          { name: "DMG / Gold", team: 1.15, enemies: 1.08, diff: 6.5 }
        ],
        winRateBySide: { blue: 56, red: 50 },
        winRateByDuration: [
          { label: "-20", value: 58 },
          { label: "20-25", value: 55 },
          { label: "25-30", value: 52 },
          { label: "30-35", value: 50 },
          { label: "35+", value: 48 }
        ],
        weakAgainst: [
          {
            name: "Thresh",
            diff: -7.2,
            score: 42,
            winRate: 40.5,
            games: 32,
            metrics: [
              { name: "DMG / min", team: 240, enemies: 295, diff: -18.6 },
              { name: "Kills / game", team: 0.8, enemies: 1.5, diff: -46.7 },
              { name: "Deaths / game", team: 4.8, enemies: 3.2, diff: -50.0 },
              { name: "Kill Participation", team: 65.2, enemies: 75.4, diff: -13.5 },
              { name: "DMG / Gold", team: 1.02, enemies: 1.22, diff: -16.4 }
            ],
            winRateBySide: { blue: 44, red: 37 },
            winRateByDuration: [
              { label: "-20", value: 35 },
              { label: "20-25", value: 38 },
              { label: "25-30", value: 42 },
              { label: "30-35", value: 45 },
              { label: "35+", value: 48 }
            ]
          },
          {
            name: "Nautilus",
            diff: -5.5,
            score: 48,
            winRate: 44.8,
            games: 28,
            metrics: [
              { name: "DMG / min", team: 255, enemies: 285, diff: -10.5 },
              { name: "Kills / game", team: 0.9, enemies: 1.3, diff: -30.8 },
              { name: "Deaths / game", team: 4.4, enemies: 3.5, diff: -25.7 },
              { name: "Kill Participation", team: 68.4, enemies: 73.2, diff: -6.6 },
              { name: "DMG / Gold", team: 1.08, enemies: 1.18, diff: -8.5 }
            ],
            winRateBySide: { blue: 48, red: 42 },
            winRateByDuration: [
              { label: "-20", value: 40 },
              { label: "20-25", value: 44 },
              { label: "25-30", value: 46 },
              { label: "30-35", value: 48 },
              { label: "35+", value: 50 }
            ]
          },
          {
            name: "Leona",
            diff: -4.1,
            score: 52,
            winRate: 47.2,
            games: 25,
            metrics: [
              { name: "DMG / min", team: 265, enemies: 280, diff: -5.4 },
              { name: "Kills / game", team: 1.0, enemies: 1.2, diff: -16.7 },
              { name: "Deaths / game", team: 4.2, enemies: 3.8, diff: -10.5 },
              { name: "Kill Participation", team: 70.2, enemies: 72.5, diff: -3.2 },
              { name: "DMG / Gold", team: 1.1, enemies: 1.15, diff: -4.3 }
            ],
            winRateBySide: { blue: 50, red: 44 },
            winRateByDuration: [
              { label: "-20", value: 44 },
              { label: "20-25", value: 46 },
              { label: "25-30", value: 48 },
              { label: "30-35", value: 50 },
              { label: "35+", value: 52 }
            ]
          }
        ],
        strongAgainst: [
          {
            name: "Yuumi",
            diff: 11.2,
            score: 85,
            winRate: 68.5,
            games: 35,
            metrics: [
              { name: "DMG / min", team: 320, enemies: 220, diff: 45.5 },
              { name: "Kills / game", team: 1.6, enemies: 0.6, diff: 166.7 },
              { name: "Deaths / game", team: 3.2, enemies: 5.2, diff: 38.5 },
              { name: "Kill Participation", team: 78.5, enemies: 62.4, diff: 25.8 },
              { name: "DMG / Gold", team: 1.25, enemies: 0.95, diff: 31.6 }
            ],
            winRateBySide: { blue: 72, red: 65 },
            winRateByDuration: [
              { label: "-20", value: 75 },
              { label: "20-25", value: 70 },
              { label: "25-30", value: 68 },
              { label: "30-35", value: 65 },
              { label: "35+", value: 60 }
            ]
          },
          {
            name: "Sona",
            diff: 8.4,
            score: 78,
            winRate: 62.4,
            games: 28,
            metrics: [
              { name: "DMG / min", team: 305, enemies: 245, diff: 24.5 },
              { name: "Kills / game", team: 1.4, enemies: 0.8, diff: 75.0 },
              { name: "Deaths / game", team: 3.5, enemies: 4.8, diff: 27.1 },
              { name: "Kill Participation", team: 76.2, enemies: 65.5, diff: 16.3 },
              { name: "DMG / Gold", team: 1.2, enemies: 1.02, diff: 17.6 }
            ],
            winRateBySide: { blue: 66, red: 58 },
            winRateByDuration: [
              { label: "-20", value: 68 },
              { label: "20-25", value: 64 },
              { label: "25-30", value: 62 },
              { label: "30-35", value: 60 },
              { label: "35+", value: 56 }
            ]
          },
          {
            name: "Soraka",
            diff: 6.8,
            score: 72,
            winRate: 58.8,
            games: 22,
            metrics: [
              { name: "DMG / min", team: 295, enemies: 255, diff: 15.7 },
              { name: "Kills / game", team: 1.3, enemies: 0.9, diff: 44.4 },
              { name: "Deaths / game", team: 3.6, enemies: 4.5, diff: 20.0 },
              { name: "Kill Participation", team: 74.5, enemies: 67.2, diff: 10.9 },
              { name: "DMG / Gold", team: 1.18, enemies: 1.05, diff: 12.4 }
            ],
            winRateBySide: { blue: 62, red: 55 },
            winRateByDuration: [
              { label: "-20", value: 64 },
              { label: "20-25", value: 60 },
              { label: "25-30", value: 58 },
              { label: "30-35", value: 56 },
              { label: "35+", value: 54 }
            ]
          }
        ]
      }
    ]
  }

  // Determine current view: team, player, or champion
  const isTeam = activePlayer === null && activeChampion === null
  const isPlayer = activePlayer !== null && activeChampion === null
  const isChampion = activeChampion !== null

  const getCurrentData = () => {
    if (isChampion) return activeChampion
    if (isPlayer) return activePlayer
    return teamData
  }

  const currentData = getCurrentData()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <Breadcrumb
          teamName={teamData.name}
          players={teamData.players}
          activePlayer={activePlayer}
          activeChampion={activeChampion}
          onTeamClick={() => {
            setActivePlayer(null)
            setActiveChampion(null)
          }}
          onPlayerChange={player => {
            setActivePlayer(player)
            setActiveChampion(null)
          }}
          onChampionChange={setActiveChampion}
        />
        <HeaderSection data={currentData} isTeam={isTeam} isChampion={isChampion} />
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <CategoryTabs categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} categoryScores={currentData.categoryScores} />
            <MetricsTable metrics={Array.isArray(currentData.metrics) ? currentData.metrics : currentData.metrics[activeCategory]} />
          </div>
          <div className="space-y-6">
            <MiniCharts winRateBySide={currentData.winRateBySide} winRateByDuration={currentData.winRateByDuration} />

            {isTeam && <PlayersList players={teamData.players} onPlayerClick={setActivePlayer} />}
            {isPlayer && <Matchups weakAgainst={activePlayer.weakAgainst} strongAgainst={activePlayer.strongAgainst} onChampionClick={setActiveChampion} />}
            {isChampion && (
              <Matchups
                weakAgainst={activePlayer.weakAgainst}
                strongAgainst={activePlayer.strongAgainst}
                onChampionClick={setActiveChampion}
                activeChampion={activeChampion.name}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryTabs({ categories, activeCategory, onCategoryChange, categoryScores }) {
  const defaultScores = { Combat: 50, Objectives: 50, Vision: 50, Income: 50 }
  const scores = categoryScores || defaultScores

  return (
    <div className="flex items-center gap-2 mb-4">
      {categories.map(cat => {
        const isActive = activeCategory === cat.id
        const score = scores[cat.id] ?? 50
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              isActive ? "bg-slate-800 border-slate-600 ring-1 ring-slate-500" : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800"
            }`}
          >
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: cat.color + "20" }}>
              <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
            </div>
            <span className={`font-bold text-sm ${score >= 70 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"}`}>{score}</span>
          </button>
        )
      })}
    </div>
  )
}

function Breadcrumb({ teamName, players, activePlayer, activeChampion, onTeamClick, onPlayerChange, onChampionChange }) {
  const allChampions = activePlayer ? [...activePlayer.weakAgainst, ...activePlayer.strongAgainst] : []

  return (
    <div className="flex items-center gap-2 mb-6 text-sm">
      <button onClick={onTeamClick} className={`font-medium transition-colors ${!activePlayer && !activeChampion ? "text-emerald-400" : "text-slate-400 hover:text-white"}`}>
        {teamName}
      </button>
      {activePlayer && (
        <>
          <span className="text-slate-600">/</span>
          <select
            value={activePlayer.name}
            onChange={e => {
              const player = players.find(p => p.name === e.target.value)
              if (player) onPlayerChange(player)
            }}
            className="bg-transparent font-medium text-emerald-400 border-none outline-none cursor-pointer hover:text-emerald-300 transition-colors"
          >
            {players.map(player => (
              <option key={player.name} value={player.name} className="bg-slate-800 text-white">
                {player.name}
              </option>
            ))}
          </select>
        </>
      )}
      {activeChampion && (
        <>
          <span className="text-slate-600">/</span>
          <select
            value={activeChampion.name}
            onChange={e => {
              const champion = allChampions.find(c => c.name === e.target.value)
              if (champion) onChampionChange(champion)
            }}
            className="bg-transparent font-medium text-emerald-400 border-none outline-none cursor-pointer hover:text-emerald-300 transition-colors"
          >
            {allChampions.map(champion => (
              <option key={champion.name} value={champion.name} className="bg-slate-800 text-white">
                {champion.name}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  )
}

function HeaderSection({ data, isTeam, isChampion }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="w-24 h-24 bg-slate-700/50 border border-emerald-500/30 rounded-lg flex items-center justify-center overflow-hidden">
            {isChampion ? (
              <img src={`/champions/${data.name}.png`} alt={data.name} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
            ) : (
              <span className="text-slate-500 text-xs">80 x 80</span>
            )}
          </div>
          {!isTeam && !isChampion && <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-900 text-xs font-bold px-2 py-1 rounded">{data.role}</div>}
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white tracking-wide">{data.name.toUpperCase()}</h1>
          {!isTeam && !isChampion && <p className="text-slate-400">{data.role}</p>}
          {isChampion && <p className="text-slate-400">Champion Matchup</p>}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center flex-1">
        <ScoreCircle score={data.score} />
        <StatsRow winRate={data.winRate} games={data.games} />
      </div>
    </div>
  )
}

function ScoreCircle({ score }) {
  return (
    <div className="relative w-28 h-28">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(51 65 85 / 0.5)" strokeWidth="6" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(16 185 129)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(score / 100) * 264} 264`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl font-bold text-white">{score}</span>
      </div>
    </div>
  )
}

function StatsRow({ winRate, games }) {
  return (
    <div className="flex items-center gap-6 mt-4 text-center">
      <div>
        <p className="text-2xl font-bold text-white">{winRate}%</p>
        <p className="text-slate-500 text-xs uppercase tracking-wider">WR</p>
      </div>
      <div className="w-px h-8 bg-slate-600" />
      <div>
        <p className="text-2xl font-bold text-white">{games}</p>
        <p className="text-slate-500 text-xs uppercase tracking-wider">GAMES</p>
      </div>
    </div>
  )
}

function MetricsTable({ metrics }) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 pb-3 border-b border-slate-700/50 text-slate-500 text-sm">
        <div>Metrique</div>
        <div className="text-center">Team</div>
        <div className="text-center">Ennemis</div>
        <div className="text-center">Diff</div>
      </div>
      {metrics.map((metric, idx) => (
        <div key={idx} className="grid grid-cols-4 gap-4 py-4 border-b border-slate-700/30 items-center">
          <div className="text-white font-medium">{metric.name}</div>
          <div className="text-center text-slate-300">{metric.team}</div>
          <div className="text-center text-slate-400">{metric.enemies}</div>
          <div className={`text-center font-semibold ${metric.diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {metric.diff >= 0 ? "+" : ""}
            {metric.diff}%
          </div>
        </div>
      ))}
    </div>
  )
}

function MiniCharts({ winRateBySide, winRateByDuration }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-lg p-4">
        <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Win Rate / Side</h3>
        <div className="flex items-end justify-center gap-6 h-24">
          <div className="flex flex-col items-center gap-1">
            <span className="text-blue-400 font-bold text-xs">{winRateBySide.blue}%</span>
            <div className="w-8 bg-blue-500 rounded-t" style={{ height: `${(winRateBySide.blue / 100) * 60}px` }} />
            <span className="text-slate-500 text-xs">Blue</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-red-400 font-bold text-xs">{winRateBySide.red}%</span>
            <div className="w-8 bg-red-400 rounded-t" style={{ height: `${(winRateBySide.red / 100) * 60}px` }} />
            <span className="text-slate-500 text-xs">Red</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg p-4">
        <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Win Rate / Duration</h3>
        <div className="flex items-end justify-around h-24">
          {winRateByDuration.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1">
              <div
                className="w-5 rounded-t"
                style={{
                  height: `${(item.value / 100) * 60}px`,
                  background: `linear-gradient(to top, rgb(99 102 241 / 0.6), rgb(139 92 246 / 0.8))`
                }}
              />
              <span className="text-slate-500 text-[10px]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PlayersList({ players, onPlayerClick }) {
  return (
    <div>
      <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Players</h3>
      <div className="space-y-2">
        {players.map((player, idx) => (
          <div
            key={idx}
            onClick={() => onPlayerClick(player)}
            className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 hover:border-emerald-500/30 transition-all"
          >
            <div className="w-8 h-8 bg-slate-600/50 rounded-full flex items-center justify-center">
              <span className="text-slate-400 text-xs font-medium">{player.role.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <span className="text-white font-medium">{player.name}</span>
              <span className="text-slate-500 text-xs ml-2">{player.role}</span>
            </div>
            <span className={`font-bold ${player.score >= 80 ? "text-emerald-400" : player.score >= 70 ? "text-amber-400" : "text-red-400"}`}>{player.score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Matchups({ weakAgainst, strongAgainst, onChampionClick, activeChampion }) {
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-slate-400 text-sm font-medium tracking-wider uppercase">Weak</span>
        </div>
        <div className="space-y-3">
          {weakAgainst.map((matchup, idx) => (
            <div
              key={idx}
              onClick={() => onChampionClick(matchup)}
              className={`bg-slate-700/30 border rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 transition-all ${
                activeChampion === matchup.name ? "border-emerald-500" : "border-slate-600/30 hover:border-red-500/30"
              }`}
            >
              <div className="w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center overflow-hidden">
                <img src={`/champions/${matchup.name}.png`} alt={matchup.name} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
              </div>
              <span className="text-white font-medium flex-1">{matchup.name}</span>
              <span className="text-red-400 font-semibold">{matchup.diff}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-400 text-sm font-medium tracking-wider uppercase">Strong</span>
        </div>
        <div className="space-y-3">
          {strongAgainst.map((matchup, idx) => (
            <div
              key={idx}
              onClick={() => onChampionClick(matchup)}
              className={`bg-slate-700/30 border rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 transition-all ${
                activeChampion === matchup.name ? "border-emerald-500" : "border-slate-600/30 hover:border-emerald-500/30"
              }`}
            >
              <div className="w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center overflow-hidden">
                <img src={`/champions/${matchup.name}.png`} alt={matchup.name} className="w-full h-full object-cover" onError={e => (e.target.style.display = "none")} />
              </div>
              <span className="text-white font-medium flex-1">{matchup.name}</span>
              <span className="text-emerald-400 font-semibold">+{matchup.diff}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
