<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useWorkHours } from '../composables/useWorkHours'
import { DIFFICULTY_TAG, STATUS_TAG } from '../types'
import type { ProjectHourStat, CategoryHourStat, HourDeviationLevel } from '../composables/useWorkHours'
import StatCard from '../components/StatCard.vue'

const router = useRouter()
const { categoryStats, totals, untrackedCount, majorProjects, sortedProjects } = useWorkHours()

/** 保留一位小数，去掉多余的 0 */
function h(v: number): string {
  return `${Math.round(v * 10) / 10}h`
}

/** 偏差率百分比，超支为正、提前为负 */
function pct(v: number): string {
  const n = Math.round(v * 100)
  return n > 0 ? `+${n}%` : `${n}%`
}

const levelTag: Record<HourDeviationLevel, { type: 'danger' | 'warning' | 'success'; text: string }> = {
  major: { type: 'danger', text: '偏差较大' },
  minor: { type: 'warning', text: '小幅超支' },
  ok: { type: 'success', text: '按时/提前' },
}

function rowClass({ row }: { row: ProjectHourStat | CategoryHourStat }): string {
  return row.level === 'major' ? 'row-major' : ''
}

function openProject(id: string) {
  router.push({ name: 'project-detail', params: { id } })
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">工时统计</h2>
      <span class="muted">对比预计工时与实际工时，实际超出预计 20% 且超过 2 小时标记为「偏差较大」</span>
    </div>

    <template v-if="totals.trackedCount">
      <div class="stat-grid">
        <StatCard label="已记录工时项目" :value="`${totals.trackedCount} / ${totals.totalCount}`" color="#409eff" icon="Timer" />
        <StatCard label="预计总工时" :value="h(totals.estimatedTotal)" color="#909399" icon="Calendar" />
        <StatCard label="实际总工时" :value="h(totals.actualTotal)" color="#e6a23c" icon="AlarmClock" />
        <StatCard label="整体偏差" :value="pct(totals.ratio)" :color="totals.diff > 0 ? '#f56c6c' : '#67c23a'" icon="DataLine" />
        <StatCard label="偏差较大项目" :value="totals.majorCount" color="#f56c6c" icon="WarningFilled" />
      </div>

      <el-alert
        v-if="untrackedCount > 0"
        :title="`还有 ${untrackedCount} 个项目未记录实际工时，完成项目时填写「实际用时」后才会纳入统计`"
        type="info"
        :closable="false"
        show-icon
        class="hint-alert"
      />

      <section class="card">
        <div class="section-title">按类别汇总</div>
        <el-table :data="categoryStats" size="small" border>
          <el-table-column prop="category" label="项目类别" min-width="110" />
          <el-table-column label="项目数" width="80" align="center">
            <template #default="{ row }">{{ row.count }}</template>
          </el-table-column>
          <el-table-column label="预计工时" width="110" align="center">
            <template #default="{ row }">{{ h(row.estimatedTotal) }}</template>
          </el-table-column>
          <el-table-column label="实际工时" min-width="180">
            <template #default="{ row }">
              <div class="hours-cell">
                <span>{{ h(row.actualTotal) }}</span>
                <el-progress
                  :percentage="row.estimatedTotal > 0 ? Math.min(999, Math.round((row.actualTotal / row.estimatedTotal) * 100)) : 0"
                  :status="row.level === 'major' ? 'exception' : row.diff > 0 ? 'warning' : 'success'"
                  :stroke-width="10"
                  :show-text="false"
                />
              </div>
            </template>
          </el-table-column>
          <el-table-column label="偏差" width="110" align="center">
            <template #default="{ row }">
              <span :class="{ 'diff-over': row.diff > 0, 'diff-under': row.diff <= 0 }">
                {{ row.diff > 0 ? '+' : '' }}{{ h(row.diff) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="偏差率" width="90" align="center">
            <template #default="{ row }">
              <span :class="{ 'diff-over': row.diff > 0, 'diff-under': row.diff <= 0 }">{{ pct(row.ratio) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="判定" width="110" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.majorCount > 0" type="danger" size="small">{{ row.majorCount }} 项偏差较大</el-tag>
              <el-tag v-else :type="levelTag[row.level as HourDeviationLevel].type" size="small">
                {{ levelTag[row.level as HourDeviationLevel].text }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section v-if="majorProjects.length" class="card major-section">
        <div class="section-title">
          <el-icon color="#f56c6c"><WarningFilled /></el-icon>
          这些活比想象中费时（{{ majorProjects.length }}）
        </div>
        <div class="major-grid">
          <div
            v-for="p in majorProjects"
            :key="p.id"
            class="major-card"
            @click="openProject(p.id)"
          >
            <div class="major-card-head">
              <span class="major-name">{{ p.name }}</span>
              <el-tag type="danger" size="small">{{ pct(p.ratio) }}</el-tag>
            </div>
            <div class="major-meta muted">{{ p.category }} · {{ p.difficulty }} · {{ p.status }}</div>
            <div class="major-hours">
              预计 {{ h(p.estimated) }} → 实际 <strong>{{ h(p.actual) }}</strong>
              <span class="diff-over">多花 {{ h(p.diff) }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="section-title">项目明细</div>
        <el-table
          :data="sortedProjects"
          size="small"
          border
          :row-class-name="rowClass"
          @row-click="(row: ProjectHourStat) => openProject(row.id)"
        >
          <el-table-column prop="name" label="项目名称" min-width="150" />
          <el-table-column prop="category" label="类别" width="100" />
          <el-table-column label="难度" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="DIFFICULTY_TAG[(row as ProjectHourStat).difficulty as keyof typeof DIFFICULTY_TAG]" size="small">
                {{ row.difficulty }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="STATUS_TAG[(row as ProjectHourStat).status as keyof typeof STATUS_TAG]" size="small">
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="预计工时" width="90" align="center">
            <template #default="{ row }">{{ h(row.estimated) }}</template>
          </el-table-column>
          <el-table-column label="实际工时" width="90" align="center">
            <template #default="{ row }"><strong>{{ h(row.actual) }}</strong></template>
          </el-table-column>
          <el-table-column label="偏差" width="100" align="center">
            <template #default="{ row }">
              <span :class="{ 'diff-over': row.diff > 0, 'diff-under': row.diff <= 0 }">
                {{ row.diff > 0 ? '+' : '' }}{{ h(row.diff) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="偏差率" width="90" align="center">
            <template #default="{ row }">
              <span :class="{ 'diff-over': row.diff > 0, 'diff-under': row.diff <= 0 }">{{ pct(row.ratio) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="判定" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="levelTag[row.level as HourDeviationLevel].type" size="small">
                {{ levelTag[row.level as HourDeviationLevel].text }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </template>

    <el-empty v-else description="还没有项目记录实际工时，在项目详情的「进度记录」中填写实际用时后即可查看统计">
      <el-button type="primary" @click="router.push({ name: 'projects' })">去看项目</el-button>
    </el-empty>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.hint-alert {
  margin-bottom: 16px;
}
.section-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.hours-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hours-cell span {
  width: 52px;
  flex-shrink: 0;
}
.hours-cell .el-progress {
  flex: 1;
}
.diff-over {
  color: var(--danger);
  font-weight: 600;
}
.diff-under {
  color: var(--success);
}
.major-section {
  margin-top: 16px;
}
.major-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.major-card {
  border: 1px solid #fbc4c4;
  background: #fef0f0;
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.major-card:hover {
  box-shadow: 0 2px 12px rgba(245, 108, 108, 0.25);
}
.major-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.major-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.major-meta {
  font-size: 12px;
  margin-bottom: 8px;
}
.major-hours {
  font-size: 13px;
}
.major-hours .diff-over {
  margin-left: 8px;
}
:deep(.row-major) {
  background-color: #fef0f0;
}
:deep(.el-table .row-major:hover td) {
  background-color: #fde2e2 !important;
}
section.card {
  margin-bottom: 16px;
}
</style>
