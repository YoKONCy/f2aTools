<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHistoryStore } from '@/stores/history'
import { useGenerationStore } from '@/stores/generation'
import { formatDate, truncateText } from '@/utils'
import {
  ElRow,
  ElCol,
  ElCard,
  ElImage,
  ElIcon,
  ElButton,
  ElMessage,
  ElMessageBox,
  ElEmpty,
  ElPagination,
  ElCheckbox,
  ElDialog,
  ElInput
} from 'element-plus'
import { Picture, Clock, Download, DocumentCopy, Delete, Search, Refresh } from '@element-plus/icons-vue'

const historyStore = useHistoryStore()
const generationStore = useGenerationStore()

// State
const searchQuery = ref('')
const selectedImages = ref<string[]>([])
const selectAll = ref(false)
const showDeleteConfirm = ref(false)

// Computed
const filteredImages = computed(() => {
  if (!searchQuery.value) {
    return historyStore.paginatedImages
  }
  return historyStore.paginatedImages.filter(image =>
    image.prompt.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const hasSelection = computed(() => selectedImages.value.length > 0)

// Methods
const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedImages.value = filteredImages.value.map(img => img.id)
  } else {
    selectedImages.value = []
  }
}

const toggleImageSelection = (imageId: string) => {
  const index = selectedImages.value.indexOf(imageId)
  if (index > -1) {
    selectedImages.value.splice(index, 1)
  } else {
    selectedImages.value.push(imageId)
  }
  selectAll.value = selectedImages.value.length === filteredImages.value.length
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

const downloadSelected = () => {
  if (selectedImages.value.length === 0) {
    ElMessage.warning('请选择要下载的图片')
    return
  }
  
  selectedImages.value.forEach(id => {
    const image = historyStore.images.find(img => img.id === id)
    if (image) {
      downloadImage(image.url, image.prompt)
    }
  })
  
  ElMessage.success(`已下载 ${selectedImages.value.length} 张图片`)
}

const copyPrompt = (promptText: string) => {
  navigator.clipboard.writeText(promptText)
  ElMessage.success('提示词已复制')
}

const regenerateImage = (prompt: string) => {
  // Navigate to home and set the prompt
  generationStore.setPrompt(prompt)
  // In a real app, you'd use router.push('/')
  ElMessage.success('提示词已复制到生成页面')
}

const deleteSelected = () => {
  if (selectedImages.value.length === 0) {
    ElMessage.warning('请选择要删除的图片')
    return
  }
  showDeleteConfirm.value = true
}

const confirmDelete = () => {
  historyStore.removeImages(selectedImages.value)
  selectedImages.value = []
  selectAll.value = false
  showDeleteConfirm.value = false
  ElMessage.success('删除成功')
}

const clearAllHistory = () => {
  ElMessageBox.confirm(
    '确定要清空所有历史记录吗？此操作不可恢复。',
    '清空历史',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    historyStore.clearHistory()
    selectedImages.value = []
    selectAll.value = false
    ElMessage.success('历史记录已清空')
  }).catch(() => {
    // User cancelled
  })
}

const handlePageChange = (page: number) => {
  historyStore.goToPage(page)
  selectedImages.value = []
  selectAll.value = false
}

// Load stores on mount
onMounted(() => {
  historyStore.loadFromStorage()
})
</script>

<template>
  <div class="history-view">
    <!-- Header -->
    <el-card class="header-card">
      <div class="header-content">
        <div class="header-left">
          <h2 class="page-title">
            <el-icon><Clock /></el-icon>
            生成历史
          </h2>
          <span class="total-count">共 {{ historyStore.totalImages }} 张</span>
        </div>
        
        <div class="header-right">
          <el-input
            v-model="searchQuery"
            placeholder="搜索提示词..."
            :prefix-icon="Search"
            size="small"
            style="width: 200px"
            clearable
          />
          
          <el-button
            type="danger"
            size="small"
            :icon="Delete"
            @click="clearAllHistory"
            :disabled="historyStore.totalImages === 0"
          >
            清空全部
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- Bulk Actions -->
    <el-card v-if="historyStore.totalImages > 0" class="actions-card">
      <div class="actions-content">
        <div class="selection-info">
          <el-checkbox v-model="selectAll" @change="toggleSelectAll">
            全选
          </el-checkbox>
          <span v-if="hasSelection" class="selected-count">
            已选择 {{ selectedImages.length }} 张
          </span>
        </div>
        
        <div class="bulk-actions">
          <el-button
            type="primary"
            size="small"
            :icon="Download"
            @click="downloadSelected"
            :disabled="!hasSelection"
          >
            批量下载
          </el-button>
          <el-button
            type="danger"
            size="small"
            :icon="Delete"
            @click="deleteSelected"
            :disabled="!hasSelection"
          >
            批量删除
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- Images Grid -->
    <el-card class="images-card">
      <div v-if="historyStore.totalImages === 0" class="empty-state">
        <el-empty description="暂无生成历史">
          <el-button type="primary" @click="$router.push('/')">
            去生成第一张图片
          </el-button>
        </el-empty>
      </div>
      
      <div v-else-if="filteredImages.length === 0 && searchQuery" class="empty-state">
        <el-empty description="没有找到匹配的图像">
          <el-button type="primary" @click="searchQuery = ''">
            清除搜索
          </el-button>
        </el-empty>
      </div>
      
      <div v-else>
        <el-row :gutter="16" class="images-grid">
          <el-col 
            v-for="image in filteredImages" 
            :key="image.id"
            :xs="24" 
            :sm="12" 
            :md="8" 
            :lg="6" 
            :xl="4"
            class="image-col"
          >
            <el-card 
              class="image-card" 
              :class="{ selected: selectedImages.includes(image.id) }"
            >
              <div class="image-container">
                <el-image
                  :src="image.url"
                  :alt="image.prompt"
                  fit="cover"
                  class="history-image"
                  :preview-src-list="[image.url]"
                  preview-teleported
                  lazy
                >
                  <template #error>
                    <div class="image-error">
                      <el-icon size="32"><Picture /></el-icon>
                      <span>加载失败</span>
                    </div>
                  </template>
                  <template #placeholder>
                    <div class="image-loading">
                      <el-icon class="is-loading"><Loading /></el-icon>
                      <span>加载中...</span>
                    </div>
                  </template>
                </el-image>
                
                <div class="image-overlay" @click.stop>
                  <el-checkbox
                    :model-value="selectedImages.includes(image.id)"
                    @change="toggleImageSelection(image.id)"
                    class="selection-checkbox"
                  />
                  
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
                    <el-button
                      type="warning"
                      circle
                      size="small"
                      @click="regenerateImage(image.prompt)"
                      title="重新生成"
                    >
                      <el-icon><Refresh /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>
              
              <div class="image-info">
                <div class="prompt-text" :title="image.prompt">
                  {{ truncateText(image.prompt, 60) }}
                </div>
                <div class="image-time">{{ formatDate(image.timestamp) }}</div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- Pagination -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="historyStore.currentPage"
            :page-size="historyStore.pageSize"
            :total="historyStore.totalImages"
            layout="prev, pager, next, jumper, sizes, total"
            :page-sizes="[12, 24, 48, 96]"
            @current-change="handlePageChange"
            @size-change="historyStore.setPageSize"
          />
        </div>
      </div>
    </el-card>

    <!-- Delete Confirmation Dialog -->
    <el-dialog
      v-model="showDeleteConfirm"
      title="确认删除"
      width="400px"
      center
    >
      <p>确定要删除选中的 {{ selectedImages.length }} 张图片吗？</p>
      <p>此操作不可恢复。</p>
      <template #footer>
        <el-button @click="showDeleteConfirm = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete">确定删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.history-view {
  max-width: 1400px;
  margin: 0 auto;
}

.header-card, .actions-card, .images-card {
  margin-bottom: 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  margin: 0;
  color: #1e3a8a;
  font-size: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.total-count {
  color: #6b7280;
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.actions-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  color: #1e3a8a;
  font-weight: 500;
}

.bulk-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
}

.images-grid {
  margin: 0;
}

.image-col {
  margin-bottom: 16px;
}

.image-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.image-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.image-card.selected {
  border-color: #1e3a8a;
  box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.2);
}

.image-container {
  position: relative;
  height: 200px;
  overflow: hidden;
  border-radius: 8px;
}

.history-image {
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
  align-items: flex-start;
  justify-content: space-between;
  padding: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.image-card:hover .image-overlay {
  opacity: 1;
}

.selection-checkbox,
.image-actions {
  pointer-events: auto;
}

.selection-checkbox {
  background: white;
  border-radius: 4px;
}

.image-actions {
  display: flex;
  gap: 4px;
}

.image-info {
  padding: 12px 8px 8px;
}

.prompt-text {
  font-size: 14px;
  color: #374151;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
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

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
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
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .actions-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .bulk-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .image-container {
    height: 150px;
  }
  
  .pagination-container {
    padding: 12px 0;
  }
}
</style>
