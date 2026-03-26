'use client'

import { useState } from 'react'

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
  }
}

