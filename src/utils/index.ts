export function generateId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // Less than 1 minute
  if (diff < 60000) {
    return '刚刚'
  }
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}分钟前`
  }
  
  // Less than 1 day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  }
  
  // More than 1 day
  return date.toLocaleDateString('zh-CN')
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength) + '...'
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

export function normalizeImageDataUrl(file: File, rawDataUrl: string): string {
  try {
    const mimeFromFile = (file.type || '').toLowerCase()
    const mime = mimeFromFile === 'image/jpg' ? 'image/jpeg' : mimeFromFile || 'image/jpeg'
    const idx = rawDataUrl.indexOf('base64,')
    const base64 = idx > -1 ? rawDataUrl.slice(idx + 'base64,'.length) : rawDataUrl
    return `data:${mime};base64,${base64}`
  } catch {
    return rawDataUrl
  }
}

export function validateImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 10 * 1024 * 1024 // 10MB
  
  if (!validTypes.includes(file.type)) {
    return false
  }
  
  if (file.size > maxSize) {
    return false
  }
  
  return true
}

export function ensureRawFile(file: any): File {
  if (file && typeof file === 'object' && 'raw' in file && file.raw instanceof File) {
    return file.raw as File
  }
  return file as File
}
