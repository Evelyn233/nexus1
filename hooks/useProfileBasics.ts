'use client'

import { useState } from 'react'

export interface LinkedInProfileData {
  name?: string
  headline?: string
  location?: string
  company?: string
  education?: string
  bio?: string
  skills?: string[]
  photoUrl?: string
  linkedinUrl?: string
  username?: string
  experiences?: Array<{
    id: string
    title: string
    company: string
    employmentType?: string
    location?: string
    startDate?: string
    endDate?: string
    current?: boolean
    description?: string
  }>
  educationItems?: Array<{
    id: string
    school: string
    degree?: string
    fieldOfStudy?: string
    startDate?: string
    endDate?: string
    grade?: string
    description?: string
  }>
}

export function useProfileBasics() {
  const [userInfo, setUserInfo] = useState<any>(null)
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [userSay, setUserSay] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showTagsInPreview, setShowTagsInPreview] = useState(true)
  const [tagsSaveToDb, setTagsSaveToDb] = useState(false)
  const [showSocialInPreview, setShowSocialInPreview] = useState(true)
  const [showLinksInPreview, setShowLinksInPreview] = useState(true)
  const [showExperienceInPreview, setShowExperienceInPreview] = useState(true)
  const [showQABlockInPreview, setShowQABlockInPreview] = useState(true)
  
  // LinkedIn imported data
  const [linkedinData, setLinkedinData] = useState<LinkedInProfileData | null>(null)
  const [linkedinImported, setLinkedinImported] = useState(false)

  // Open to Work toggle
  const [openToWork, setOpenToWork] = useState(false)

  return {
    userInfo,
    setUserInfo,
    avatarDataUrl,
    setAvatarDataUrl,
    userSay,
    setUserSay,
    tags,
    setTags,
    selectedTags,
    setSelectedTags,
    showTagsInPreview,
    setShowTagsInPreview,
    tagsSaveToDb,
    setTagsSaveToDb,
    showSocialInPreview,
    setShowSocialInPreview,
    showLinksInPreview,
    setShowLinksInPreview,
    showExperienceInPreview,
    setShowExperienceInPreview,
    showQABlockInPreview,
    setShowQABlockInPreview,
    // LinkedIn
    linkedinData,
    setLinkedinData,
    linkedinImported,
    setLinkedinImported,
    // Open to Work
    openToWork,
    setOpenToWork,
  }
}

