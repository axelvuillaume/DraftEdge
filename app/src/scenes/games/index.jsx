import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import api from "@/services/api";

export default function Games() {
 const [games, setGames] = useState([]);

    const fetchGames = async () => {
        try {
            const { ok, data, code  } = await api.post("/game/search", {});
            if (!ok) return toast.error(code);
            setGames(data);
        } catch (error) {
            toast.error(error.message);
        }
    }

    useEffect(() => {
        fetchGames();
    }, []);

  return (
    <div>
      <div className="flex flex-col gap-4">
        {games.map((game) => (
            <div key={game._id}>
                {game.name}
                <PlayerStatsCard key={game._id} game={game} />
            </div>
        ))}
      </div>
    </div>
  );
}


const PlayerStatsCard = ({ game }) => {
    const [playerStats, setPlayerStats] = useState([]);

    const fetchPlayerStats = async () => {
        try {
            const { ok, data, code  } = await api.post("/playerstats/search", { game_id: game._id });
            if (!ok) return toast.error(code);
            setPlayerStats(data);
        } catch (error) {
            toast.error(error.message);
        }
    }

    useEffect(() => {
        fetchPlayerStats();
    }, [game._id]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        {playerStats.map((playerStat) => (
          <div key={playerStat._id}>
            <h1>{playerStat.summoner_name}</h1>
            <h1>{playerStat.champion}</h1>
            <h1>{playerStat.role}</h1>
          </div>
        ))}
      </div>
    </div>
  );
}