'use client'

import type { ExperienceItem, EducationItem } from '@/lib/profileTypes'
import { Briefcase, GraduationCap, Pencil } from 'lucide-react'

type Props = {
  experiences: ExperienceItem[]
  education: EducationItem[]
  showExperienceInPreview: boolean
  onEditExperience: (exp: ExperienceItem) => void
  onEditEducation: (edu: EducationItem) => void
}

export function ProfileExperiencePreview({
  experiences,
  education,
  showExperienceInPreview,
  onEditExperience,
  onEditEducation,
}: Props) {
  if (!showExperienceInPreview || (experiences.length === 0 && education.length === 0)) {
    return null
  }

  return (
    <div className="flex flex-col w-full px-4 pt-2 pb-2 shrink-0 border-t border-white/50">
      <p className="text-xs text-gray-500 mb-1.5">Experience</p>
      {experiences.length > 0 && (
        <div className="space-y-2 mb-2">
          {experiences.map((e) => (
            <div key={e.id} className="flex gap-2 p-2 rounded-lg bg-white/90 border border-white/80">
              <Briefcase className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-800">{e.title}</p>
                <p className="text-[10px] text-gray-600">
                  {e.company}
                  {e.employmentType ? ` · ${e.employmentType}` : ''}
                </p>
                <p className="text-[10px] text-gray-500">
                  {(e.startDate || e.endDate)
                    ? `${e.startDate || '—'} - ${e.current ? '至今' : (e.endDate || '—')}`
                    : ''}
                  {e.location ? ` · ${e.location}` : ''}
                </p>
                {e.description && (
                  <p className="text-[10px] text-gray-600 line-clamp-2 mt-0.5">{e.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onEditExperience(e)}
                className="shrink-0 p-1 rounded text-gray-400 hover:text-teal-600 hover:bg-teal-50"
                aria-label="编辑"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {education.length > 0 && (
        <div className="space-y-2">
          {education.map((edu) => (
            <div key={edu.id} className="flex gap-2 p-2 rounded-lg bg-white/90 border border-white/80">
              <GraduationCap className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-800">{edu.school}</p>
                <p className="text-[10px] text-gray-600">
                  {(edu.degree || edu.fieldOfStudy)
                    ? [edu.degree, edu.fieldOfStudy].filter(Boolean).join(' · ')
                    : ''}
                </p>
                <p className="text-[10px] text-gray-500">
                  {(edu.startDate || edu.endDate)
                    ? `${edu.startDate || '—'} - ${edu.endDate || '—'}`
                    : ''}
                  {edu.grade ? ` · ${edu.grade}` : ''}
                </p>
                {edu.description && (
                  <p className="text-[10px] text-gray-600 line-clamp-2 mt-0.5">{edu.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onEditEducation(edu)}
                className="shrink-0 p-1 rounded text-gray-400 hover:text-teal-600 hover:bg-teal-50"
                aria-label="编辑"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

