import axios from 'axios'
import { fileToBase64, normalizeImageDataUrl, ensureRawFile } from '@/utils'

export interface GenerationParams {
  model?: string
}

export interface GenerationRequest {
  prompt: string
  referenceImage?: File
  referenceImages?: File[]
  params?: GenerationParams
}

export interface GenerationResponse {
  id: string
  url: string
  prompt: string
  timestamp: number
  violation?: boolean
}

class AiApiService {
  private apiBase = (() => {
    const envBase = (import.meta as any).env?.VITE_API_BASE_URL || ''
    return envBase
  })()
  private apiKey = (import.meta as any).env?.VITE_API_KEY || ''
  private maxRetries = 3
  private timeout = 240000
  private requestQueue: Array<{ req: GenerationRequest, resolve: (resp: GenerationResponse) => void, reject: (err: any) => void }> = []
  private activeRequests = 0
  private maxConcurrency = 5

  constructor() {
    this.setupAxiosInterceptors()
  }

  private setupAxiosInterceptors() {
    axios.interceptors.response.use(
      response => response,
      async error => {
        const config = error.config

        if (!config || !config.retryCount) {
          config.retryCount = 0
        }

        if (config.retryCount < this.maxRetries) {
          config.retryCount++
          console.log(`Retrying request (${config.retryCount}/${this.maxRetries})`)

          // Exponential backoff
          const delay = Math.pow(2, config.retryCount) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))

          return axios(config)
        }

        return Promise.reject(error)
      }
    )
  }

  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ req: request, resolve, reject })
      this.processQueue().catch(reject)
    })
  }

  private async processQueue() {
    if (this.activeRequests >= this.maxConcurrency || this.requestQueue.length === 0) {
      return
    }

    const queued = this.requestQueue.shift()
    if (!queued) return

    this.activeRequests++

    try {
      const apiData = await this.makeApiRequest(queued.req)
      const extractedUrl = this.extractImageUrl(apiData)
      const isViolation = !extractedUrl
      const imageUrl = extractedUrl || this.generatePlaceholderUrl(queued.req.prompt)
      const resp: GenerationResponse = {
        id: this.generateId(),
        url: imageUrl,
        prompt: queued.req.prompt,
        timestamp: Date.now(),
        violation: isViolation
      }
      queued.resolve(resp)
    } catch (err) {
      queued.reject(err)
    } finally {
      this.activeRequests--
      if (this.requestQueue.length > 0) {
        this.processQueue()
      }
    }
  }

  private async makeApiRequest(request: GenerationRequest): Promise<any> {
    const content: any[] = []
    if (request.prompt && request.prompt.trim().length > 0) {
      content.push({ type: 'text', text: request.prompt })
    }
    if (request.referenceImage) {
      const rawFile = ensureRawFile(request.referenceImage)
      const raw = await fileToBase64(rawFile)
      const dataUrl = normalizeImageDataUrl(rawFile, raw)
      content.push({ type: 'image_url', image_url: { url: dataUrl } })
      try {
        const imgLen = (dataUrl || '').length
        const imgMime = rawFile.type
        console.log(`[AIAPI] image attached mime=${imgMime} len=${imgLen}`)
      } catch {}
    }
    if (Array.isArray(request.referenceImages) && request.referenceImages.length > 0) {
      const files = request.referenceImages.filter(Boolean)
      for (const f of files) {
        const rawFile = ensureRawFile(f)
        const raw = await fileToBase64(rawFile)
        const dataUrl = normalizeImageDataUrl(rawFile, raw)
        content.push({ type: 'image_url', image_url: { url: dataUrl } })
      }
      console.log(`[AIAPI] multiple images attached count=${files.length}`)
    }

    const body = {
      model: request.params?.model || 'gemini-2.5-flash-image-landscape',
      messages: [
        { role: 'user', content }
      ],
      stream: true
    }

    let abortTimer: any
    try {
      const hasImage = content.some((c: any) => c?.type === 'image_url' && c?.image_url?.url)
      console.log(`[AIAPI] content items=${content.length} hasImage=${hasImage}`)
      const chatUrl = this.apiBase.replace(/\/+$/, '') + '/v1/chat/completions'
      const controller = new AbortController()
      abortTimer = setTimeout(() => controller.abort(), this.timeout)
      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          console.error(`Unauthorized: HTTP ${res.status}`)
        }
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) {
        throw new Error('Stream not available')
      }

      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let lastParsed: any = null
      const accContent: any[] = []

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n')
        buffer = parts.pop() || ''
        for (const lineRaw of parts) {
          const line = lineRaw.trim()
          if (!line) continue
          if (!line.startsWith('data:')) continue
          const payload = line.slice('data:'.length).trim()
          if (payload === '[DONE]') {
            break
          }
          try {
            const parsed = JSON.parse(payload)
            lastParsed = parsed
            const ch = parsed?.choices?.[0]
            if (Array.isArray(ch?.delta?.content)) {
              accContent.push(...ch.delta.content)
            }
            if (ch?.delta?.image_url?.url) {
              accContent.push({ type: 'image_url', image_url: { url: ch.delta.image_url.url } })
            }
            if (ch?.delta?.url) {
              accContent.push({ type: 'image_url', image_url: { url: ch.delta.url } })
            }
            if (typeof ch?.delta?.content === 'string' && ch?.delta?.content) {
              const immediate = this.extractImageUrl({ choices: [{ delta: { content: ch.delta.content } }] })
              if (typeof immediate === 'string' && immediate) {
                clearTimeout(abortTimer)
                return { url: immediate }
              }
            }
            if (Array.isArray(ch?.message?.content)) {
              // some providers send the final full message
              accContent.splice(0, accContent.length, ...ch.message.content)
            }
          } catch {}
        }
      }

      if (accContent.length > 0) {
        console.log(`[AIAPI] stream accumulated content items=${accContent.length}`)
        clearTimeout(abortTimer)
        return { choices: [{ message: { content: accContent } }] }
      }
      if (lastParsed) {
        clearTimeout(abortTimer)
        return lastParsed
      }
      throw new Error('No streaming data parsed')
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    } finally {
      if (abortTimer) clearTimeout(abortTimer)
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const url = this.apiBase.replace(/\/+$/, '') + '/v1/models'
      const res = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        timeout: this.timeout,
        withCredentials: false
      })

      const data = res.data
      if (Array.isArray(data?.data)) {
        return data.data.map((m: any) => m.id || m.name).filter(Boolean)
      }
      if (Array.isArray(data)) {
        return data.map((m: any) => m.id || m.name).filter(Boolean)
      }
      return []
    } catch (error) {
      console.error('获取模型失败:', error)
      throw error
    }
  }

  private extractImageUrl(apiData: any): string | null {
    try {
      if (!apiData) return null
      const mdImg = (s: string): string | null => {
        try {
          const m = s.match(/!\[[^\]]*\]\(([^\)]+)\)/)
          return m && m[1] ? m[1] : null
        } catch { return null }
      }
      const htmlVideo = (s: string): string | null => {
        try {
          const m = s.match(/<video[^>]*src=['"]([^'\"]+)['"][^>]*>/i)
          return m && m[1] ? m[1] : null
        } catch { return null }
      }
      if (Array.isArray(apiData?.data)) {
        const first = apiData.data[0]
        if (typeof first?.url === 'string') return first.url
        if (typeof first?.image_url?.url === 'string') return first.image_url.url
        const b64 = first?.b64_json || first?.image_base64 || first?.base64
        if (typeof b64 === 'string' && b64.length > 0) return `data:image/png;base64,${b64}`
      }
      const choices = apiData?.choices
      if (Array.isArray(choices)) {
        const content = choices[0]?.message?.content
        if (Array.isArray(content)) {
          for (const item of content) {
            if (item?.type === 'image_url' && item?.image_url?.url) {
              return item.image_url.url as string
            }
            if ((item?.type === 'input_image' || item?.type === 'image' || item?.type === 'output_image') && item?.image_url?.url) {
              return item.image_url.url as string
            }
            if ((item?.type === 'image' || item?.type === 'input_image' || item?.type === 'output_image') && item?.url) {
              return item.url as string
            }
            const b64 = item?.b64_json || item?.image_base64 || item?.base64
            if (typeof b64 === 'string' && b64.length > 0) {
              return `data:image/png;base64,${b64}`
            }
          }
        }
        if (typeof content === 'string' && content) {
          const u1 = mdImg(content)
          if (u1) return u1
          const u2 = htmlVideo(content)
          if (u2) return u2
        }
        const delta = choices[0]?.delta
        if (delta?.image_url?.url) return delta.image_url.url
        if (typeof delta?.url === 'string') return delta.url
        if (typeof delta?.content === 'string' && delta?.content) {
          const u1 = mdImg(delta.content)
          if (u1) return u1
          const u2 = htmlVideo(delta.content)
          if (u2) return u2
        }
        const db64 = delta?.b64_json || delta?.image_base64 || delta?.base64
        if (typeof db64 === 'string' && db64.length > 0) return `data:image/png;base64,${db64}`
      }
      if (apiData?.image_url?.url) return apiData.image_url.url
      if (typeof apiData?.url === 'string') return apiData.url
      return null
    } catch {
      return null
    }
  }

  private generateId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generatePlaceholderUrl(prompt: string): string {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAA=='
  }

  setMaxConcurrency(limit: number) {
    this.maxConcurrency = Math.max(1, Math.min(10, limit))
  }

  setTimeoutMs(ms: number) {
    this.timeout = Math.max(1000, Math.min(600000, Math.floor(ms || 0)))
  }

  getActiveRequests(): number {
    return this.activeRequests
  }

  getQueueLength(): number {
    return this.requestQueue.length
  }

  cancelAllRequests() {
    this.requestQueue = []
    // Note: Canceling active requests would require more complex implementation
    // with AbortController for axios requests
  }
}

export const aiApiService = new AiApiService()
