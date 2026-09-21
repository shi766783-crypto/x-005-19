<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useWorkHours } from '../composables/useWorkHours'
import { STATUS_TAG } from '../types'
import StatCard from '../components/StatCard.vue'

const router = useRouter()
const { categoryStats, overall, deviatingProjects } = useWorkHours()

/** 工时保留 1 位小数，整数则不带小数点 */
function fmtHours(h: number): string {
  return Number.isInteger(h) ? String(h) : h.toFixed(1)
}

/** 偏差带符号显示，如 +2.5h / -1h */
function fmtDeviation(d: number): string {
  return `${d > 0 ? '+' : ''}${fmtHours(d)}h`
}

/** 偏差率 → 百分比文本，null 表示未填预计工时 */
function fmtRate(rate: number | null): string {
  if (rate === null) return '—'
  return `${rate > 0 ? '+' : ''}${Math.round(rate * 100)}%`
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">工时统计</h2>
      <span class="muted">仅统计已记录实际工时的项目，保证预计与实际可比</span>
    </div>

    <template v-if="overall.projectCount > 0">
      <div class="stat-grid">
        <StatCard label="统计项目数" :value="overall.projectCount" color="#409eff" icon="Notebook" />
        <StatCard label="预计总工时" :value="`${fmtHours(overall.estimated)}h`" color="#909399" icon="AlarmClock" />
        <StatCard label="实际总工时" :value="`${fmtHours(overall.actual)}h`" color="#e6a23c" icon="Timer" />
        <StatCard
          label="总偏差"
          :value="fmtDeviation(overall.deviation)"
          :color="overall.deviation > 0 ? '#f56c6c' : '#67c23a'"
          icon="DataLine"
        />
        <StatCard label="偏差较大项目" :value="deviatingProjects.length" color="#f56c6c" icon="Warning" />
      </div>

      <section class="card">
        <div class="section-title">分类汇总</div>
        <el-table :data="categoryStats" size="small" border>
          <el-table-column prop="category" label="类别" min-width="100" />
          <el-table-column prop="projectCount" label="项目数" width="80" align="center" />
          <el-table-column label="预计工时" width="100" align="center">
            <template #default="{ row }">{{ fmtHours(row.estimated) }}h</template>
          </el-table-column>
          <el-table-column label="实际工时" width="100" align="center">
            <template #default="{ row }">{{ fmtHours(row.actual) }}h</template>
          </el-table-column>
          <el-table-column label="偏差" width="100" align="center">
            <template #default="{ row }">
              <span :class="row.deviation > 0 ? 'dev-over' : 'dev-under'">{{ fmtDeviation(row.deviation) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="偏差率" min-width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.deviationRate !== null" :type="row.deviation > 0 ? 'danger' : 'success'" size="small">
                {{ fmtRate(row.deviationRate) }}
              </el-tag>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section class="card">
        <div class="section-head">
          <span class="section-title">偏差较大的项目</span>
          <span class="muted">偏差率 ≥ 20% 且偏差 ≥ 0.5h</span>
        </div>
        <el-table v-if="deviatingProjects.length" :data="deviatingProjects" size="small" border>
          <el-table-column label="项目" min-width="140">
            <template #default="{ row }">
              <el-link type="primary" @click="router.push({ name: 'project-detail', params: { id: row.project.id } })">
                {{ row.project.name }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="project.category" label="类别" width="100" align="center" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="STATUS_TAG[row.project.status as keyof typeof STATUS_TAG]" size="small">
                {{ row.project.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="预计" width="80" align="center">
            <template #default="{ row }">{{ fmtHours(row.estimated) }}h</template>
          </el-table-column>
          <el-table-column label="实际" width="80" align="center">
            <template #default="{ row }">{{ fmtHours(row.actual) }}h</template>
          </el-table-column>
          <el-table-column label="偏差" width="90" align="center">
            <template #default="{ row }">
              <span :class="row.deviation > 0 ? 'dev-over' : 'dev-under'">{{ fmtDeviation(row.deviation) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="偏差率" width="100" align="center">
            <template #default="{ row }">
              <span v-if="row.deviationRate !== null">{{ fmtRate(row.deviationRate) }}</span>
              <span v-else class="muted">未预估</span>
            </template>
          </el-table-column>
          <el-table-column label="结论" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.direction === 'over' ? 'danger' : 'success'" size="small">
                {{ row.direction === 'over' ? '超时' : '提前' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="没有偏差较大的项目，工时预估很准" :image-size="60" />
      </section>
    </template>

    <el-empty v-else description="暂无工时数据：在项目详情中记录实际用时后即可查看统计" />
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-title {
  font-weight: 600;
  font-size: 15px;
}
.card {
  margin-bottom: 16px;
}
.dev-over {
  color: var(--danger);
  font-weight: 600;
}
.dev-under {
  color: var(--success);
  font-weight: 600;
}
</style>
