<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGenerationStore } from '@/stores/generation'
import { useHistoryStore } from '@/stores/history'
import { aiApiService } from '@/services/aiApi'
import { generateId, validateImageFile, formatDate, ensureRawFile } from '@/utils'
import {
  ElRow,
  ElCol,
  ElCard,
  ElInput,
  ElButton,
  ElUpload,
  ElSlider,
  ElSelect,
  ElOption,
  ElProgress,
  ElImage,
  ElIcon,
  ElMessage,
  ElEmpty,
  ElTag,
  ElInputNumber
} from 'element-plus'
import { Picture, Upload, Download, DocumentCopy, Delete, Loading } from '@element-plus/icons-vue'

const generationStore = useGenerationStore()
const historyStore = useHistoryStore()

// Form state
const prompt = ref('')
const referenceImage1 = ref<File | null>(null)
const referenceImage2 = ref<File | null>(null)
const referenceImage3 = ref<File | null>(null)
const referenceImage4 = ref<File | null>(null)
const imageUrl1 = ref<string>('')
const imageUrl2 = ref<string>('')
const imageUrl3 = ref<string>('')
const imageUrl4 = ref<string>('')
const isGenerating = ref(false)
const generateProgress = ref(0)

// Parameters
const selectedModel = ref('gemini-2.5-flash-image-landscape')
const modelOptions = ref<string[]>(['gemini-2.5-flash-image-landscape'])
const fetchingModels = ref(false)
const concurrencyLimit = ref(5)
const timeoutSeconds = ref(240)
const isI2V = computed(() => selectedModel.value.includes('_i2v_'))
const isT2V = computed(() => selectedModel.value.includes('_t2v_'))
const isR2V = computed(() => selectedModel.value.includes('_r2v_'))
const imageCount = computed(() => [referenceImage1.value, referenceImage2.value, referenceImage3.value, referenceImage4.value].filter(Boolean).length)
const validationMessage = computed(() => {
  if (isT2V.value && imageCount.value > 0) return '文生视频模型不支持上传图片'
  if (isI2V.value && imageCount.value < 1) return '首尾帧模型至少需要1张图片'
  if (isR2V.value && imageCount.value < 2) return '多图模型至少需要2张图片'
  return ''
})

// Computed
const canGenerate = computed(() => {
  const base = !isGenerating.value && prompt.value.trim().length > 0 && generationStore.activeRequests < concurrencyLimit.value
  if (!base) return false
  if (isT2V.value) return imageCount.value === 0
  if (isI2V.value) return imageCount.value >= 1
  if (isR2V.value) return imageCount.value >= 2
  return true
})

const wordCount = computed(() => prompt.value.length)

const fetchModels = async () => {
  fetchingModels.value = true
  ElMessage.info('正在获取模型...')
  try {
    const models = await aiApiService.getModels()
    if (models && models.length > 0) {
      modelOptions.value = models
      if (!models.includes(selectedModel.value)) {
        selectedModel.value = models[0] || selectedModel.value
      }
      ElMessage.success(`模型获取成功，共 ${models.length} 个`)
    } else {
      ElMessage.warning('未获取到模型')
    }
  } catch (e) {
    ElMessage.error('获取模型失败，请检查 API 地址与秘钥配置')
  } finally {
    fetchingModels.value = false
  }
}

// Methods
const handleBeforeUpload1 = (file: any) => {
  const rawFile = ensureRawFile(file)
  if (!validateImageFile(rawFile)) {
    ElMessage.error('请上传有效的图片文件 (JPG, PNG, WebP, 最大10MB)')
    return false
  }
  if (referenceImage1.value) {
    ElMessage.warning('该槽位已上传图片')
    return false
  }
  return true
}

const handleBeforeUpload2 = (file: any) => {
  const rawFile = ensureRawFile(file)
  if (!validateImageFile(rawFile)) {
    ElMessage.error('请上传有效的图片文件 (JPG, PNG, WebP, 最大10MB)')
    return false
  }
  if (referenceImage2.value) {
    ElMessage.warning('该槽位已上传图片')
    return false
  }
  return true
}

const handleUploadChange1 = (file: any) => {
  const rawFile = ensureRawFile(file)
  referenceImage1.value = rawFile
  imageUrl1.value = URL.createObjectURL(rawFile)
}

const handleUploadChange2 = (file: any) => {
  const rawFile = ensureRawFile(file)
  referenceImage2.value = rawFile
  imageUrl2.value = URL.createObjectURL(rawFile)
}

const handleBeforeUpload3 = (file: any) => {
  const rawFile = ensureRawFile(file)
  if (!validateImageFile(rawFile)) {
    ElMessage.error('请上传有效的图片文件 (JPG, PNG, WebP, 最大10MB)')
    return false
  }
  if (referenceImage3.value) {
    ElMessage.warning('该槽位已上传图片')
    return false
  }
  return true
}

const handleBeforeUpload4 = (file: any) => {
  const rawFile = ensureRawFile(file)
  if (!validateImageFile(rawFile)) {
    ElMessage.error('请上传有效的图片文件 (JPG, PNG, WebP, 最大10MB)')
    return false
  }
  if (referenceImage4.value) {
    ElMessage.warning('该槽位已上传图片')
    return false
  }
  return true
}

const handleUploadChange3 = (file: any) => {
  const rawFile = ensureRawFile(file)
  referenceImage3.value = rawFile
  imageUrl3.value = URL.createObjectURL(rawFile)
}

const handleUploadChange4 = (file: any) => {
  const rawFile = ensureRawFile(file)
  referenceImage4.value = rawFile
  imageUrl4.value = URL.createObjectURL(rawFile)
}

const applyTimeout = () => {
  const secs = Math.max(5, Math.min(600, Number(timeoutSeconds.value) || 60))
  timeoutSeconds.value = secs
  aiApiService.setTimeoutMs(secs * 1000)
  ElMessage.success(`超时已设置为 ${secs} 秒`)
}

const removeReferenceImage1 = () => {
  if (imageUrl1.value) URL.revokeObjectURL(imageUrl1.value)
  referenceImage1.value = null
  imageUrl1.value = ''
}

const removeReferenceImage2 = () => {
  if (imageUrl2.value) URL.revokeObjectURL(imageUrl2.value)
  referenceImage2.value = null
  imageUrl2.value = ''
}

const removeReferenceImage3 = () => {
  if (imageUrl3.value) URL.revokeObjectURL(imageUrl3.value)
  referenceImage3.value = null
  imageUrl3.value = ''
}

const removeReferenceImage4 = () => {
  if (imageUrl4.value) URL.revokeObjectURL(imageUrl4.value)
  referenceImage4.value = null
  imageUrl4.value = ''
}

const generateImage = async () => {
  if (!prompt.value.trim()) {
    ElMessage.warning('请输入提示词')
    return
  }

  isGenerating.value = true
  generateProgress.value = 0

  try {
    const total = Math.max(1, Math.min(10, concurrencyLimit.value))
    aiApiService.setMaxConcurrency(total)

    const progressInterval = setInterval(() => {
      generateProgress.value += Math.random() * 15
      if (generateProgress.value >= 90) {
        clearInterval(progressInterval)
      }
    }, 500)

    let completed = 0
    const finalize = () => {
      if (completed >= total) {
        clearInterval(progressInterval)
        generateProgress.value = 100
        setTimeout(() => {
          generateProgress.value = 0
          isGenerating.value = false
        }, 1000)
      }
    }

    for (let i = 0; i < total; i++) {
      setTimeout(() => {
        const imageId = generateId()
        generationStore.addGeneratedImage({
          id: imageId,
          url: '',
          prompt: prompt.value,
          timestamp: Date.now(),
          status: 'pending'
        })

      aiApiService.generateImage({
        prompt: prompt.value,
        referenceImages: (isT2V.value ? [] : [referenceImage1.value, referenceImage2.value, referenceImage3.value, referenceImage4.value].filter(Boolean)) as File[],
        params: { model: selectedModel.value }
      }).then(response => {
          if (typeof (generationStore as any).setImageResult === 'function') {
            ;(generationStore as any).setImageResult(imageId, response.url, 'completed')
          } else {
            const img = generationStore.generatedImages.find(it => it.id === imageId)
            if (img) {
              img.url = response.url
              img.status = 'completed'
            }
          }
          if ((response as any).violation) {
            generationStore.setViolation(imageId, '内容违规或连接错误')
          }
          historyStore.addImage({
            id: response.id,
            url: response.url,
            prompt: response.prompt,
            timestamp: response.timestamp,
            status: 'completed'
          })
          completed++
          finalize()
        }).catch(err => {
          const img = generationStore.generatedImages.find(it => it.id === imageId)
          if (img) {
            img.status = 'failed'
          }
          completed++
          finalize()
        })
      }, i * 3000)
    }
    ElMessage.success(`已提交 ${total} 个生成请求`)

  } catch (error) {
    console.error('生成失败:', error)
    ElMessage.error('图像生成失败，请重试')
    isGenerating.value = false
    generateProgress.value = 0
  }
}

const downloadImage = (imageUrl: string, prompt: string) => {
  const link = document.createElement('a')
  link.href = imageUrl
  link.download = `ai-image-${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  ElMessage.success('下载成功')
}

const copyPrompt = (promptText: string) => {
  navigator.clipboard.writeText(promptText)
  ElMessage.success('提示词已复制')
}

// Load stores on mount
onMounted(() => {
  generationStore.loadFromStorage()
  historyStore.loadFromStorage()
  fetchModels()
})
</script>

<template>
  <div class="home-view">
    <el-row :gutter="24">
      <!-- Left Panel - Input Area -->
      <el-col :xs="24" :lg="12">
        <el-card class="input-card">
          <template #header>
            <div class="card-header">
              <el-icon><Picture /></el-icon>
              <span>图像生成</span>
            </div>
          </template>

          <!-- Prompt Input -->
          <div class="form-section">
            <label class="section-label">提示词</label>
            <el-input
              v-model="prompt"
              type="textarea"
              :rows="6"
              placeholder="请输入您想要生成的图像描述，例如：一只可爱的猫咪在花园里玩耍"
            />
            <div class="word-count">字数: {{ wordCount }}</div>
          </div>

          <!-- Reference Image Upload -->
          <div class="form-section">
            <label class="section-label">参考图片（可选）</label>
            <div class="param-row">
              <el-upload
                class="image-upload"
                drag
                accept="image/*"
                :auto-upload="false"
                :before-upload="handleBeforeUpload1"
                :on-change="handleUploadChange1"
                :disabled="isT2V"
                :show-file-list="false"
              >
                <div v-if="!imageUrl1" class="upload-content">
                  <el-icon class="upload-icon"><Upload /></el-icon>
                  <div class="upload-text">{{ isI2V ? '首帧（可选）' : '参考图片1（可选）' }}</div>
                  <div class="upload-hint">支持 JPG、PNG、WebP，最大 10MB</div>
                </div>
                <div v-else class="image-preview">
                  <img :src="imageUrl1" alt="Reference1" />
                  <el-button
                    type="danger"
                    circle
                    size="small"
                    class="remove-btn"
                    @click="removeReferenceImage1"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </el-upload>
            </div>
            <div class="param-row">
              <el-upload
                class="image-upload"
                drag
                accept="image/*"
                :auto-upload="false"
                :before-upload="handleBeforeUpload2"
                :on-change="handleUploadChange2"
                :disabled="isT2V"
                :show-file-list="false"
              >
                <div v-if="!imageUrl2" class="upload-content">
                  <el-icon class="upload-icon"><Upload /></el-icon>
                  <div class="upload-text">{{ isI2V ? '尾帧（可选）' : '参考图片2（可选）' }}</div>
                  <div class="upload-hint">支持 JPG、PNG、WebP，最大 10MB</div>
                </div>
                <div v-else class="image-preview">
                  <img :src="imageUrl2" alt="Reference2" />
                  <el-button
                    type="danger"
                    circle
                    size="small"
                    class="remove-btn"
                    @click="removeReferenceImage2"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </el-upload>
            </div>
            <div class="param-row" v-if="isR2V">
              <el-upload
                class="image-upload"
                drag
                accept="image/*"
                :auto-upload="false"
                :before-upload="handleBeforeUpload3"
                :on-change="handleUploadChange3"
                :disabled="isT2V"
                :show-file-list="false"
              >
                <div v-if="!imageUrl3" class="upload-content">
                  <el-icon class="upload-icon"><Upload /></el-icon>
                  <div class="upload-text">参考图片3（可选）</div>
                  <div class="upload-hint">支持 JPG、PNG、WebP，最大 10MB</div>
                </div>
                <div v-else class="image-preview">
                  <img :src="imageUrl3" alt="Reference3" />
                  <el-button
                    type="danger"
                    circle
                    size="small"
                    class="remove-btn"
                    @click="removeReferenceImage3"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </el-upload>
            </div>
            <div class="param-row" v-if="isR2V">
              <el-upload
                class="image-upload"
                drag
                accept="image/*"
                :auto-upload="false"
                :before-upload="handleBeforeUpload4"
                :on-change="handleUploadChange4"
                :disabled="isT2V"
                :show-file-list="false"
              >
                <div v-if="!imageUrl4" class="upload-content">
                  <el-icon class="upload-icon"><Upload /></el-icon>
                  <div class="upload-text">参考图片4（可选）</div>
                  <div class="upload-hint">支持 JPG、PNG、WebP，最大 10MB</div>
                </div>
                <div v-else class="image-preview">
                  <img :src="imageUrl4" alt="Reference4" />
                  <el-button
                    type="danger"
                    circle
                    size="small"
                    class="remove-btn"
                    @click="removeReferenceImage4"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </el-upload>
            </div>
            <div v-if="validationMessage" class="param-row">
              <el-tag type="warning" size="small">{{ validationMessage }}</el-tag>
            </div>
          </div>

          <!-- Parameters -->
          <div class="form-section">
            <label class="section-label">生成参数</label>
            <div class="param-row">
          <span class="param-label">模型:</span>
          <el-select v-model="selectedModel" size="small" style="width: 260px">
            <el-option v-for="m in modelOptions" :key="m" :label="m" :value="m" />
          </el-select>
          <el-button size="small" :loading="fetchingModels" @click="fetchModels">获取模型</el-button>
        </div>
            <div class="param-row">
              <span class="param-label">并发数:</span>
              <el-slider
                v-model="concurrencyLimit"
                :min="1"
                :max="10"
                :step="1"
                show-input
                size="small"
                style="width: 200px"
              />
            </div>
            <div class="param-row">
              <span class="param-label">超时(秒):</span>
              <el-input-number
                v-model="timeoutSeconds"
                :min="5"
                :max="600"
                :step="5"
                size="small"
              />
              <el-button size="small" type="primary" @click="applyTimeout">应用</el-button>
            </div>
          </div>

          <!-- Generate Button -->
          <div class="form-section">
            <el-button
              type="primary"
              size="large"
              :loading="isGenerating"
              :disabled="!canGenerate"
              @click="generateImage"
              class="generate-btn"
            >
              <el-icon><Picture /></el-icon>
              {{ isGenerating ? '生成中...' : '开始生成' }}
            </el-button>

            <el-progress
              v-if="isGenerating"
              :percentage="generateProgress"
              :stroke-width="6"
              :show-text="false"
              class="progress-bar"
            />
          </div>
        </el-card>
      </el-col>

      <!-- Right Panel - Preview Area -->
      <el-col :xs="24" :lg="12">
        <el-card class="preview-card">
          <template #header>
            <div class="card-header">
              <el-icon><Picture /></el-icon>
              <span>生成结果</span>
              <el-tag v-if="generationStore.activeRequests > 0" type="info" size="small">
                活跃: {{ generationStore.activeRequests }}
              </el-tag>
            </div>
          </template>

          <div v-if="generationStore.generatedImages.length === 0" class="empty-state">
            <el-empty description="暂无生成的图像" />
          </div>

          <div v-else class="image-grid">
            <div
              v-for="image in generationStore.generatedImages.slice(0, 6)"
              :key="image.id"
              class="image-item"
            >
              <div class="image-container">
                <template v-if="image.url">
                  <el-image
                    :src="image.url"
                    :alt="image.prompt"
                    fit="cover"
                    class="generated-image"
                    :preview-src-list="[image.url]"
                  />
                </template>
                <template v-else-if="image.status === 'failed'">
                  <div class="image-error">
                    <el-icon size="32"><Picture /></el-icon>
                    <span>生成失败</span>
                  </div>
                </template>
                <template v-else>
                  <div class="image-loading">
                    <el-icon class="is-loading"><Loading /></el-icon>
                    <span>生成中...</span>
                  </div>
                </template>
                <div v-if="image.violation" class="violation-badge">内容违规或连接错误</div>

                <div class="image-overlay">
                  <div class="image-actions">
                    <el-button
                      type="primary"
                      circle
                      size="small"
                      @click="downloadImage(image.url, image.prompt)"
                      title="下载"
                    >
                      <el-icon><Download /></el-icon>
                    </el-button>
                    <el-button
                      type="info"
                      circle
                      size="small"
                      @click="copyPrompt(image.prompt)"
                      title="复制提示词"
                    >
                      <el-icon><DocumentCopy /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>

              <div class="image-info">
                <div class="prompt-text">{{ image.prompt }}</div>
                <div class="image-time">{{ formatDate(image.timestamp) }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.home-view {
  max-width: 1400px;
  margin: 0 auto;
}

.input-card, .preview-card {
  height: calc(100vh - 120px);
  overflow-y: auto;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #1e3a8a;
}

.form-section {
  margin-bottom: 24px;
}

.section-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.word-count {
  text-align: right;
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.image-upload {
  width: 100%;
}

.upload-content {
  padding: 40px 20px;
  text-align: center;
}

.upload-icon {
  font-size: 48px;
  color: #9ca3af;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 16px;
  color: #374151;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 12px;
  color: #6b7280;
}

.image-preview {
  position: relative;
  padding: 10px;
}

.image-preview img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
}

.remove-btn {
  position: absolute;
  top: 20px;
  right: 20px;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.param-label {
  width: 60px;
  font-size: 14px;
  color: #374151;
}

.generate-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}

.progress-bar {
  margin-top: 16px;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.image-item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.image-item:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.image-container {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.generated-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-container:hover .image-overlay {
  opacity: 1;
}

.image-actions {
  display: flex;
  gap: 8px;
}

.violation-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(220, 38, 38, 0.9);
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.image-info {
  padding: 12px;
}

.prompt-text {
  font-size: 14px;
  color: #374151;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.image-time {
  font-size: 12px;
  color: #6b7280;
}

.image-error, .image-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
  gap: 8px;
}

.image-loading .el-icon {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .input-card, .preview-card {
    height: auto;
    margin-bottom: 16px;
  }

  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }

  .upload-content {
    padding: 30px 15px;
  }

  .param-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .param-label {
    width: auto;
  }
}
</style>
