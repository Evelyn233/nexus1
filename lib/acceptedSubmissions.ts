/**
 * Looking for：招募方「接受的投递」形式（存 peopleNeeded[].acceptedSubmissions，逗号分隔 value）
 */
export const ACCEPTED_SUBMISSION_OPTIONS = [
  { value: 'profile-direct', label: 'Profile 直投', desc: '从主页 / Plaza 发起联系即可' },
  { value: 'questions', label: '回答我想问的问题', desc: '按你预设的问题结构化回复' },
  { value: 'portfolio', label: '作品 / 案例', desc: '附链接或说明代表作' },
  { value: 'intro', label: '简短自荐', desc: '几句话说明能为项目带来什么' },
  { value: 'resume', label: '经历简述', desc: '相关经验、技能与时间投入' },
  { value: 'call', label: '先语音 / 视频', desc: '愿意简短通话再深聊' },
] as const

export type AcceptedSubmissionValue = (typeof ACCEPTED_SUBMISSION_OPTIONS)[number]['value']

export function acceptedSubmissionsFromString(raw: string | undefined): string[] {
  return (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean)
}

export function acceptedSubmissionLabel(value: string): string {
  const o = ACCEPTED_SUBMISSION_OPTIONS.find((x) => x.value === value)
  return o?.label ?? value
}
