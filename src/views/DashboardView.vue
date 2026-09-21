<script setup lang="ts">
import { computed } from 'vue'
import { useDashboard } from '../composables/useDashboard'
import { useToolStore } from '../stores/useToolStore'
import { useMaterialStore } from '../stores/useMaterialStore'
import { useProjectStore } from '../stores/useProjectStore'
import { useWorkHours } from '../composables/useWorkHours'
import { TOOL_CATEGORIES, MATERIAL_CATEGORIES } from '../types'
import StatCard from '../components/StatCard.vue'

const { stats } = useDashboard()
const toolStore = useToolStore()
const materialStore = useMaterialStore()
const projectStore = useProjectStore()
const { totals, majorProjects } = useWorkHours()

const toolByCategory = computed(() =>
  TOOL_CATEGORIES.map((c) => ({
    category: c,
    count: toolStore.tools.value.filter((t) => t.category === c).reduce((s, t) => s + t.quantity, 0),
  })).filter((x) => x.count > 0),
)

const materialByCategory = computed(() =>
  MATERIAL_CATEGORIES.map((c) => ({
    category: c,
    count: materialStore.materials.value.filter((m) => m.category === c).length,
  })).filter((x) => x.count > 0),
)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">数据看板</h2>
    </div>

    <div class="stat-grid">
      <StatCard label="工具总数" :value="stats.toolTotal" color="#409eff" icon="Suitcase" />
      <StatCard label="材料种类" :value="stats.materialKinds" color="#67c23a" icon="Box" />
      <StatCard label="进行中项目" :value="stats.inProgress" color="#e6a23c" icon="Loading" />
      <StatCard label="本月完成项目" :value="stats.completedThisMonth" color="#9c27b0" icon="Medal" />
      <StatCard label="库存预警" :value="stats.lowStock" color="#f56c6c" icon="Warning" />
    </div>

    <div class="two-col">
      <section class="card">
        <div class="section-title">工具分类分布</div>
        <div v-for="item in toolByCategory" :key="item.category" class="dist-row">
          <span>{{ item.category }}</span>
          <el-progress
            :percentage="toolStore.totalQuantity.value ? Math.round((item.count / toolStore.totalQuantity.value) * 100) : 0"
            :format="() => `${item.count} 件`"
          />
        </div>
        <el-empty v-if="!toolByCategory.length" description="暂无工具" :image-size="60" />
      </section>

      <section class="card">
        <div class="section-title">材料分类分布</div>
        <div v-for="item in materialByCategory" :key="item.category" class="dist-row">
          <span>{{ item.category }}</span>
          <el-progress
            :percentage="materialStore.categoryCount.value ? Math.round((item.count / materialStore.categoryCount.value) * 100) : 0"
            :format="() => `${item.count} 种`"
          />
        </div>
        <el-empty v-if="!materialByCategory.length" description="暂无材料" :image-size="60" />
      </section>
    </div>

    <section class="card work-hours-card" @click="$router.push({ name: 'work-hours' })">
      <div class="work-hours-head">
        <div class="section-title" style="margin-bottom: 0">工时偏差概览</div>
        <el-button text type="primary">查看完整统计<el-icon class="el-icon--right"><ArrowRight /></el-icon></el-button>
      </div>
      <template v-if="totals.trackedCount">
        <div class="work-hours-body">
          <div class="wh-item">
            <span class="muted">预计总工时</span>
            <strong>{{ totals.estimatedTotal }}h</strong>
          </div>
          <el-icon class="wh-arrow"><Right /></el-icon>
          <div class="wh-item">
            <span class="muted">实际总工时</span>
            <strong>{{ totals.actualTotal }}h</strong>
          </div>
          <div class="wh-item">
            <span class="muted">整体偏差</span>
            <strong :class="totals.diff > 0 ? 'diff-over' : 'diff-under'">
              {{ totals.diff > 0 ? '+' : '' }}{{ Math.round(totals.diff * 10) / 10 }}h
              （{{ Math.round(totals.ratio * 100) }}%）
            </strong>
          </div>
          <div class="wh-item">
            <el-tag v-if="totals.majorCount" type="danger" size="small">{{ totals.majorCount }} 个项目比预想费时</el-tag>
            <el-tag v-else type="success" size="small">无明显偏差</el-tag>
          </div>
        </div>
        <div v-if="majorProjects.length" class="wh-major muted">
          <el-icon color="#f56c6c"><WarningFilled /></el-icon>
          {{ majorProjects.slice(0, 3).map((p) => p.name).join('、') }}{{ majorProjects.length > 3 ? ' 等' : '' }}
          实际工时明显超出预计
        </div>
      </template>
      <div v-else class="muted" style="padding: 8px 0">暂无实际工时记录，完成项目后填写「实际用时」即可生成偏差统计</div>
    </section>

    <section class="card">
      <div class="section-title">进行中的项目</div>
      <el-table v-if="projectStore.inProgressProjects.value.length" :data="projectStore.inProgressProjects.value" size="small" border>
        <el-table-column prop="name" label="项目" min-width="150" />
        <el-table-column prop="difficulty" label="难度" width="90" align="center" />
        <el-table-column label="预计工时" width="100" align="center">
          <template #default="{ row }">{{ row.estimatedHours }}h</template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无进行中的项目" :image-size="60" />
    </section>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
@media (max-width: 900px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}
.section-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 12px;
}
.dist-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.dist-row span {
  width: 80px;
  flex-shrink: 0;
}
.dist-row .el-progress {
  flex: 1;
}
.work-hours-card {
  margin-bottom: 16px;
  cursor: pointer;
}
.work-hours-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.work-hours-body {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}
.wh-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 15px;
}
.wh-arrow {
  color: var(--text-secondary);
}
.diff-over {
  color: var(--danger);
}
.diff-under {
  color: var(--success);
}
.wh-major {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 13px;
}
</style>
