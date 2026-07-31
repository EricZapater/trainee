import { ref } from 'vue'

const STORAGE_KEY = 'trainee_page_size'
const DEFAULT_PAGE_SIZE = 10

export function usePaginationPreference(defaultSize: number = DEFAULT_PAGE_SIZE) {
  const getStoredPreference = (): number => {
    const val = localStorage.getItem(STORAGE_KEY)
    if (val) {
      const parsed = parseInt(val, 10)
      if ([10, 20, 25, 50].includes(parsed)) {
        return parsed
      }
    }
    return defaultSize
  }

  const pageSize = ref<number>(getStoredPreference())

  const setPageSize = (size: number) => {
    if (!size || size <= 0) return
    pageSize.value = size
    localStorage.setItem(STORAGE_KEY, size.toString())
  }

  return {
    pageSize,
    setPageSize,
    pageSizeOptions: [10, 20, 50]
  }
}
