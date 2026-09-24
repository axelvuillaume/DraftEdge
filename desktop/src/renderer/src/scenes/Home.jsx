import LcuStatus, { useLcuStatus } from '../components/LcuStatus'
import Import from './Import'

export default function Home({ user }) {
  const lcu = useLcuStatus()

  if (!user.team_id) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-sm">
        Your account is not linked to any team. Join a team on DraftEdge before importing games.
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pt-4 max-w-4xl w-full mx-auto">
        <LcuStatus status={lcu} />
      </div>
      <Import user={user} lcu={lcu} />
    </div>
  )
}
