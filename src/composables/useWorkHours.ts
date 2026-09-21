import { computed } from 'vue'
import { PROJECT_CATEGORIES, type Project, type ProjectCategory } from '../types'
import { toNumber } from '../utils/format'
import { useProjectStore } from '../stores/useProjectStore'

/** 显著超支判定：实际比预计多出的比例 ≥ 20%，且绝对偏差 ≥ 2 小时 */
export const HOUR_OVERRUN_RATIO = 0.2
export const HOUR_OVERRUN_ABS_HOURS = 2

/** major = 偏差较大（显著超支） · minor = 小幅超支 · ok = 按时或提前 */
export type HourDeviationLevel = 'major' | 'minor' | 'ok'

export interface ProjectHourStat {
  id: string
  name: string
  category: ProjectCategory
  difficulty: Project['difficulty']
  status: Project['status']
  estimated: number
  actual: number
  diff: number // 实际 - 预计，正数表示超时
  ratio: number // diff / estimated
  level: HourDeviationLevel
}

export interface CategoryHourStat {
  category: ProjectCategory
  count: number // 已记录实际工时的项目数
  estimatedTotal: number
  actualTotal: number
  diff: number
  ratio: number
  level: HourDeviationLevel
  majorCount: number // 该类别下显著超支的项目数
}

function ratioOf(diff: number, estimated: number): number {
  if (estimated > 0) return diff / estimated
  // 预计为 0 时：只要实际有投入即视为 100% 偏差
  return diff > 0 ? 1 : 0
}

function levelOf(diff: number, ratio: number): HourDeviationLevel {
  if (diff >= HOUR_OVERRUN_ABS_HOURS && ratio >= HOUR_OVERRUN_RATIO) return 'major'
  if (diff > 0) return 'minor'
  return 'ok'
}

/**
 * 工时统计派生数据：对比项目的预计工时与实际工时。
 * 仅统计已填写 actualHours 的项目，纯派生逻辑，不写数据。
 */
export function useWorkHours() {
  const projectStore = useProjectStore()

  /** 已记录实际工时、可参与对比的项目 */
  const trackedProjects = computed<ProjectHourStat[]>(() =>
    projectStore.projects.value
      .filter((p) => p.actualHours !== undefined && p.actualHours !== null)
      .map((p) => {
        const estimated = toNumber(p.estimatedHours)
        const actual = toNumber(p.actualHours)
        const diff = actual - estimated
        const ratio = ratioOf(diff, estimated)
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          difficulty: p.difficulty,
          status: p.status,
          estimated,
          actual,
          diff,
          ratio,
          level: levelOf(diff, ratio),
        }
      }),
  )

  /** 按类别汇总预计与实际工时（无已记录项目的类别不展示） */
  const categoryStats = computed<CategoryHourStat[]>(() =>
    PROJECT_CATEGORIES.map((category) => {
      const rows = trackedProjects.value.filter((p) => p.category === category)
      const estimatedTotal = rows.reduce((s, r) => s + r.estimated, 0)
      const actualTotal = rows.reduce((s, r) => s + r.actual, 0)
      const diff = actualTotal - estimatedTotal
      const ratio = ratioOf(diff, estimatedTotal)
      return {
        category,
        count: rows.length,
        estimatedTotal,
        actualTotal,
        diff,
        ratio,
        level: levelOf(diff, ratio),
        majorCount: rows.filter((r) => r.level === 'major').length,
      }
    }).filter((c) => c.count > 0),
  )

  /** 全部已记录项目的合计 */
  const totals = computed(() => {
    const rows = trackedProjects.value
    const estimatedTotal = rows.reduce((s, r) => s + r.estimated, 0)
    const actualTotal = rows.reduce((s, r) => s + r.actual, 0)
    const diff = actualTotal - estimatedTotal
    return {
      trackedCount: rows.length,
      totalCount: projectStore.projects.value.length,
      estimatedTotal,
      actualTotal,
      diff,
      ratio: ratioOf(diff, estimatedTotal),
      majorCount: rows.filter((r) => r.level === 'major').length,
    }
  })

  /** 尚未记录实际工时的项目数（规划中/进行中等，无法参与对比） */
  const untrackedCount = computed(() => totals.value.totalCount - totals.value.trackedCount)

  /** 偏差较大的项目：按偏差率从大到小排列，让最“费时”的活排最前 */
  const majorProjects = computed(() =>
    trackedProjects.value
      .filter((p) => p.level === 'major')
      .sort((a, b) => b.ratio - a.ratio || b.diff - a.diff),
  )

  /** 全部已记录项目：偏差大的在前，其余按偏差率降序 */
  const sortedProjects = computed(() =>
    [...trackedProjects.value].sort((a, b) => {
      if (a.level !== b.level) return a.level === 'major' ? -1 : b.level === 'major' ? 1 : 0
      return b.ratio - a.ratio
    }),
  )

  return { trackedProjects, categoryStats, totals, untrackedCount, majorProjects, sortedProjects }
}
