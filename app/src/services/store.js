import { create } from "zustand"

const store = create(set => ({
  user: null,
  setUser: user => set(() => ({ user })),

  organization: null,
  setOrganization: organization => set(() => ({ organization })),

  // Search navigation state for statsV2
  searchNavigation: null,
  setSearchNavigation: searchNavigation => set(() => ({ searchNavigation: searchNavigation ? { ...searchNavigation, timestamp: Date.now() } : null }))
}))

export default store
