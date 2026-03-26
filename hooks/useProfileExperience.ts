'use client'

import { useState } from 'react'
import type { ExperienceItem, EducationItem } from '@/lib/profileTypes'

export function useProfileExperience() {
  const [experiences, setExperiences] = useState<ExperienceItem[]>([])
  const [education, setEducation] = useState<EducationItem[]>([])
  const [showExperienceModal, setShowExperienceModal] = useState(false)
  const [experienceModalTab, setExperienceModalTab] = useState<'experience' | 'education'>('experience')
  const [editingExpId, setEditingExpId] = useState<string | null>(null)
  const [editingEduId, setEditingEduId] = useState<string | null>(null)
  const [expForm, setExpForm] = useState<Omit<ExperienceItem, 'id'> & { id?: string }>({
    title: '',
    company: '',
    employmentType: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
  })
  const [eduForm, setEduForm] = useState<Omit<EducationItem, 'id'> & { id?: string }>({
    school: '',
    degree: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    grade: '',
    description: '',
  })

  return {
    experiences,
    setExperiences,
    education,
    setEducation,
    showExperienceModal,
    setShowExperienceModal,
    experienceModalTab,
    setExperienceModalTab,
    editingExpId,
    setEditingExpId,
    editingEduId,
    setEditingEduId,
    expForm,
    setExpForm,
    eduForm,
    setEduForm,
  }
}

