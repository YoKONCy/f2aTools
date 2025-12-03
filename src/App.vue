<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ElContainer, ElHeader, ElMain } from 'element-plus'
import { Picture, Clock } from '@element-plus/icons-vue'
</script>

<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <h1 class="app-title">AI 图像生成器</h1>
        <nav class="app-nav">
          <router-link to="/" class="nav-link">
            <el-icon><Picture /></el-icon>
            生成
          </router-link>
          <router-link to="/history" class="nav-link">
            <el-icon><Clock /></el-icon>
            历史
          </router-link>
        </nav>
      </div>
    </el-header>
    
    <el-main class="app-main">
      <RouterView />
    </el-main>
  </el-container>
</template>

<style scoped>
.app-container {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.app-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0;
  height: 64px !important;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.app-title {
  margin: 0;
  color: #1e3a8a;
  font-size: 24px;
  font-weight: 600;
}

.app-nav {
  display: flex;
  gap: 16px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  text-decoration: none;
  color: #64748b;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: 500;
}

.nav-link:hover {
  color: #1e3a8a;
  background: rgba(30, 58, 138, 0.1);
}

.nav-link.router-link-active {
  color: #1e3a8a;
  background: rgba(30, 58, 138, 0.15);
}

.app-main {
  padding: 24px;
  background: transparent;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .header-content {
    padding: 0 16px;
  }
  
  .app-title {
    font-size: 20px;
  }
  
  .nav-link {
    padding: 6px 12px;
    font-size: 14px;
  }
  
  .app-main {
    padding: 16px;
  }
}
</style>
