export type ExperienceItem = {
  id: string
  title: string
  company: string
  employmentType?: string
  location?: string
  startDate?: string
  endDate?: string
  current?: boolean
  description?: string
}

export type EducationItem = {
  id: string
  school: string
  degree?: string
  fieldOfStudy?: string
  startDate?: string
  endDate?: string
  grade?: string
  description?: string
}

export type PeopleNeededItem = {
  text: string
  detail?: string
  stageTag?: string
  contentTag?: string
  collabIntent?: string
  /** 接受的投递形式，逗号分隔：profile-direct | questions | portfolio | intro | resume | call */
  acceptedSubmissions?: string
  /** 勾选「回答我想问的问题」时填写：每条一行或自由描述 */
  recruiterQuestions?: string
  image?: string
  link?: string
  workMode?: 'local' | 'remote'
  location?: string
}

export type ProjectReference = {
  title: string
  url: string
  cover?: string
  description?: string
  stageTag?: string
  contentTag?: string
  contributor?: string
}

export type ProjectAttachment = {
  url: string
  name: string
  addedAt?: number
  stageTag?: string
  contentTag?: string
  contributor?: string
}

export type ProjectItem = {
  text: string
  visibility: 'individual' | 'public' | 'hidden'
  showOnPlaza: boolean
  peopleNeeded?: PeopleNeededItem[]
  detail?: string
  references?: ProjectReference[]
  detailImage?: string
  attachments?: ProjectAttachment[]
  stage?: string
  stageOrder?: string[]
  stageEnteredAt?: Record<string, number>
  aiSuggestedStages?: string[]
  creators?: string[]
  createdAt?: number
  projectTypeTags?: string[]
  openStatusLabel?: string
  allowEasyApply?: boolean
  whatToProvide?: string
  cultureAndBenefit?: string
  initiatorRole?: string
  oneSentenceDesc?: string
}

