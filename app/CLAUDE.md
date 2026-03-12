# Frontend Conventions

## API Fetch Pattern

ALWAYS use this exact pattern for API calls:

```jsx
const fetchObjectifs = async () => {
  try {
    const { ok, data, code } = await api.post("/scrim-objectif/search", { team_id: user?.team_id })
    if (!ok) return toast.error(code || "Failed to fetch objectives")
    setObjectifs(data)
  } catch (error) {
    toast.error(error.code || "Failed to fetch objectives")
  }
}
```

Rules:

- ALWAYS use `api.post` or `api.get` from `services/api.js` (NEVER use fetch/axios directly)
- ALWAYS destructure `{ ok, data, code }` from the response
- ALWAYS handle errors with `toast.error` using `code` as the message
- ALWAYS wrap in try/catch

## State Management for Fetched Objects

When fetching an object (e.g. a team, a player), ALWAYS store it as a single state object:

```jsx
const [team, setTeam] = useState(null)
```

NEVER create separate useState for each field of the object. NEVER create a helper like `setField`. Update fields directly inline:

```jsx
onChange={e => setTeam(prev => ({ ...prev, league: e.target.value }))}
```

## PUT Requests

For PUT/update requests, ALWAYS send the entire object directly. NEVER list fields individually:

```jsx
// GOOD
await api.put(`/enemy-team/${id}`, team)

// BAD - never do this
await api.put(`/enemy-team/${id}`, { league: team.league, notes: team.notes, ... })
```

## No Promise.all

NEVER use `Promise.all` to parallelize API calls. Always call fetches sequentially, one after another.

```jsx
// GOOD
const res1 = await api.post("/endpoint1", payload1)
const res2 = await api.post("/endpoint2", payload2)

// BAD - never do this
const [res1, res2] = await Promise.all([api.post("/endpoint1", payload1), api.post("/endpoint2", payload2)])
```

## Nested Fetches

NEVER fetch inside another fetch in the same component.
If you need to fetch child data from a parent list:

- Create a child component for each item in the list
- Each child component fetches its own data by ID

## Shared Fetches

If the same API call is used by multiple route components (e.g. List and View), ALWAYS move it to the parent `index.jsx` and pass the data as a prop. NEVER duplicate the same fetch in multiple sibling components.

```jsx
// index.jsx
export default function Index() {
  const [stats, setStats] = useState([])
  // fetch here...
  return (
    <Routes>
      <Route path="/" element={<List stats={stats} />} />
      <Route path="/:id" element={<View stats={stats} />} />
    </Routes>
  )
}
```

## Components and Data

NEVER create a component that doesn't fetch its own data. Every component is responsible for fetching the data it needs.
