import { useCaseStore } from '@/stores/caseStore'

export function useCases() {
  const {
    cases,
    currentCase,
    isLoading,
    error,
    pagination,
    fetchCases,
    fetchCaseById,
    createCase,
    updateCase,
    deleteCase,
    addCaseTeamMember,
    removeCaseTeamMember,
    setCaseFilter,
    setCurrentCase,
  } = useCaseStore()

  return {
    cases,
    currentCase,
    isLoading,
    error,
    pagination,
    fetchCases,
    fetchCaseById,
    createCase,
    updateCase,
    deleteCase,
    addCaseTeamMember,
    removeCaseTeamMember,
    setCaseFilter,
    setCurrentCase,
  }
}
