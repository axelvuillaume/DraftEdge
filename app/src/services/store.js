import { create } from "zustand"

const store = create(set => ({
  user: null,
  setUser: user => set(() => ({ user })),

  organization: null,
  setOrganization: organization => set(() => ({ organization })),

  // Search navigation state for statsV2
  searchNavigation: null,
  setSearchNavigation: searchNavigation => set(() => ({ searchNavigation: searchNavigation ? { ...searchNavigation, timestamp: Date.now() } : null })),

  // Global filters (patch, folder, opponent)
  globalFilters: { patch: null, folder_id: null, opponent_name: null },
  setGlobalFilters: filters => set(state => ({ globalFilters: { ...state.globalFilters, ...filters } })),
  resetGlobalFilters: () => set(() => ({ globalFilters: { patch: null, folder_id: null, opponent_name: null } })),

  // Cache for filter options
  filterOptions: { patches: [], folders: [], opponents: [] },
  setFilterOptions: filterOptions => set(() => ({ filterOptions }))
}))

export default store
