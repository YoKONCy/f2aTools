import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GeneratedImage } from './generation'

export const useHistoryStore = defineStore('history', () => {
  // State
  const images = ref<GeneratedImage[]>([])
  const currentPage = ref(1)
  const pageSize = ref(12)

  // Getters
  const totalImages = computed(() => images.value.length)
  const totalPages = computed(() => Math.ceil(totalImages.value / pageSize.value))
  
  const paginatedImages = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return images.value.slice(start, end)
  })

  const hasPreviousPage = computed(() => currentPage.value > 1)
  const hasNextPage = computed(() => currentPage.value < totalPages.value)

  // Actions
  function addImage(image: GeneratedImage) {
    images.value.unshift(image)
    saveToStorage()
  }

  function removeImage(id: string) {
    const index = images.value.findIndex(img => img.id === id)
    if (index !== -1) {
      images.value.splice(index, 1)
      saveToStorage()
    }
  }

  function removeImages(ids: string[]) {
    images.value = images.value.filter(img => !ids.includes(img.id))
    saveToStorage()
  }

  function clearHistory() {
    images.value = []
    currentPage.value = 1
    saveToStorage()
  }

  function goToPage(page: number) {
    currentPage.value = Math.max(1, Math.min(totalPages.value, page))
  }

  function setPageSize(size: number) {
    pageSize.value = Math.max(6, Math.min(48, size))
    currentPage.value = 1 // Reset to first page
  }

  // Load from localStorage
  function loadFromStorage() {
    const stored = localStorage.getItem('history-store')
    if (stored) {
      const data = JSON.parse(stored)
      images.value = data.images || []
      currentPage.value = data.currentPage || 1
      pageSize.value = data.pageSize || 12
    }
  }

  // Save to localStorage
  function saveToStorage() {
    const data = {
      images: images.value,
      currentPage: currentPage.value,
      pageSize: pageSize.value
    }
    localStorage.setItem('history-store', JSON.stringify(data))
  }

  return {
    // State
    images,
    currentPage,
    pageSize,
    
    // Getters
    totalImages,
    totalPages,
    paginatedImages,
    hasPreviousPage,
    hasNextPage,
    
    // Actions
    addImage,
    removeImage,
    removeImages,
    clearHistory,
    goToPage,
    setPageSize,
    loadFromStorage,
    saveToStorage
  }
})