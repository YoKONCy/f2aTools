import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface GeneratedImage {
  id: string
  url: string
  prompt: string
  timestamp: number
  status: 'pending' | 'completed' | 'failed'
  violation?: boolean
  violationReason?: string
}

export const useGenerationStore = defineStore('generation', () => {
  // State
  const currentPrompt = ref('')
  const concurrencyLimit = ref(5)
  const activeRequests = ref(0)
  const generatedImages = ref<GeneratedImage[]>([])

  // Getters
  

  // Actions
  function setPrompt(prompt: string) {
    currentPrompt.value = prompt
  }

  function setConcurrencyLimit(limit: number) {
    concurrencyLimit.value = Math.max(1, Math.min(10, limit))
  }

  function addGeneratedImage(image: GeneratedImage) {
    generatedImages.value.unshift(image)
  }


  function setImageResult(id: string, url: string, status: 'completed' | 'failed' = 'completed') {
    const image = generatedImages.value.find(img => img.id === id)
    if (image) {
      image.url = url
      image.status = status
    }
  }

  function setViolation(id: string, reason?: string) {
    const image = generatedImages.value.find(img => img.id === id)
    if (image) {
      image.violation = true
      image.violationReason = reason || ''
    }
  }


  function clearGeneratedImages() {
    generatedImages.value = []
  }

  // Load from localStorage
  function loadFromStorage() {
    const stored = localStorage.getItem('generation-store')
    if (stored) {
      const data = JSON.parse(stored)
      concurrencyLimit.value = data.concurrencyLimit || 5
      generatedImages.value = data.generatedImages || []
    }
  }

  // Save to localStorage
  function saveToStorage() {
    const data = {
      concurrencyLimit: concurrencyLimit.value,
      generatedImages: generatedImages.value
    }
    localStorage.setItem('generation-store', JSON.stringify(data))
  }

  return {
    // State
    currentPrompt,
    concurrencyLimit,
    activeRequests,
    generatedImages,
    
    // Getters
    
    // Actions
    setPrompt,
    setConcurrencyLimit,
    addGeneratedImage,
    setImageResult,
    setViolation,
    clearGeneratedImages,
    loadFromStorage,
    saveToStorage
  }
})
