import { computed } from 'vue'
import { PROJECT_CATEGORIES, type Project, type ProjectCategory } from '../types'
import { toNumber } from '../utils/format'
import { useProjectStore } from '../stores/useProjectStore'

/** 偏差率阈值：|实际-预计|/预计 ≥ 20% 视为偏差较大 */
export const DEVIATION_RATE_THRESHOLD = 0.2

/** 最小绝对偏差（小时）：低于此值不标记，避免微小波动产生噪音 */
export const MIN_ABS_DEVIATION = 0.5

export interface CategoryHoursStat {
  category: ProjectCategory
  projectCount: number // 已记录实际工时的项目数
  estimated: number // 预计工时合计
  actual: number // 实际工时合计
  deviation: number // actual - estimated
  deviationRate: number | null // estimated 为 0 时为 null
}

export interface ProjectHoursDeviation {
  project: Project
  estimated: number
  actual: number
  deviation: number
  deviationRate: number | null
  direction: 'over' | 'under' // over=超时，under=提前
}

function deviationRate(estimated: number, actual: number): number | null {
  if (estimated <= 0) return null
  return (actual - estimated) / estimated
}

function isLargeDeviation(estimated: number, actual: number): boolean {
  const diff = actual - estimated
  if (Math.abs(diff) < MIN_ABS_DEVIATION) return false
  const rate = deviationRate(estimated, actual)
  // 未填预计工时（为 0）却实际耗时，直接视为偏差较大
  if (rate === null) return actual > 0
  return Math.abs(rate) >= DEVIATION_RATE_THRESHOLD
}

/**
 * 工时统计派生数据：按类别汇总预计/实际工时，并找出偏差较大的项目。
 * 口径：仅统计已填写实际工时的项目（进行中/已完成均可），保证预计与实际可比。
 * 纯派生逻辑，不写数据。
 */
export function useWorkHours() {
  const projectStore = useProjectStore()

  /** 已记录实际工时的项目 */
  const trackedProjects = computed(() =>
    projectStore.projects.value.filter((p) => p.actualHours !== undefined && p.actualHours !== null),
  )

  /** 按类别汇总预计/实际工时（仅包含有记录的项目，空类别被过滤） */
  const categoryStats = computed<CategoryHoursStat[]>(() =>
    PROJECT_CATEGORIES.map((category) => {
      const list = trackedProjects.value.filter((p) => p.category === category)
      const estimated = list.reduce((s, p) => s + toNumber(p.estimatedHours), 0)
      const actual = list.reduce((s, p) => s + toNumber(p.actualHours), 0)
      return {
        category,
        projectCount: list.length,
        estimated,
        actual,
        deviation: actual - estimated,
        deviationRate: deviationRate(estimated, actual),
      }
    }).filter((s) => s.projectCount > 0),
  )

  /** 全部已记录项目的合计 */
  const overall = computed(() => {
    const estimated = trackedProjects.value.reduce((s, p) => s + toNumber(p.estimatedHours), 0)
    const actual = trackedProjects.value.reduce((s, p) => s + toNumber(p.actualHours), 0)
    return {
      projectCount: trackedProjects.value.length,
      estimated,
      actual,
      deviation: actual - estimated,
      deviationRate: deviationRate(estimated, actual),
    }
  })

  /** 偏差较大的项目：超时在前，按偏差率绝对值降序（无预计工时的排最前） */
  const deviatingProjects = computed<ProjectHoursDeviation[]>(() =>
    trackedProjects.value
      .filter((p) => isLargeDeviation(toNumber(p.estimatedHours), toNumber(p.actualHours)))
      .map((project) => {
        const estimated = toNumber(project.estimatedHours)
        const actual = toNumber(project.actualHours)
        const deviation = actual - estimated
        return {
          project,
          estimated,
          actual,
          deviation,
          deviationRate: deviationRate(estimated, actual),
          direction: deviation > 0 ? ('over' as const) : ('under' as const),
        }
      })
      .sort((a, b) => {
        if (a.direction !== b.direction) return a.direction === 'over' ? -1 : 1
        const ra = a.deviationRate === null ? Infinity : Math.abs(a.deviationRate)
        const rb = b.deviationRate === null ? Infinity : Math.abs(b.deviationRate)
        return rb - ra
      }),
  )

  return { trackedProjects, categoryStats, overall, deviatingProjects }
}
