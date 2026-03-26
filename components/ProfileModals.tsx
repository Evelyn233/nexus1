'use client'

import { X, ChevronRight } from 'lucide-react'

type ProfileMessage = { id: string; text: string; createdAt: string; from: { id: string; name: string; image: string | null } | null }
type PotentialConnection = { targetUserId: string; targetName?: string; hint: string; possibleTopics?: string[]; viewedAt: string; source?: 'viewed' | 'engage' }

type Props = {
  showMessagesModal: boolean
  setShowMessagesModal: (v: boolean) => void
  profileMessages: ProfileMessage[]
  sessionUserName?: string | null
  onAnswerToQa: (text: string) => void
  showPotentialConnectionModal: boolean
  setShowPotentialConnectionModal: (v: boolean) => void
  viewedPotentialConnections: PotentialConnection[]
  showSendMessageModal: boolean
  setShowSendMessageModal: (v: boolean) => void
  sendMessageDraft: string
  setSendMessageDraft: (v: string) => void
  sendToEvelynFeedback: 'idle' | 'sending' | 'sent' | 'error'
  onSendMessage: () => void
}

export function ProfileModals({
  showMessagesModal,
  setShowMessagesModal,
  profileMessages,
  sessionUserName,
  onAnswerToQa,
  showPotentialConnectionModal,
  setShowPotentialConnectionModal,
  viewedPotentialConnections,
  showSendMessageModal,
  setShowSendMessageModal,
  sendMessageDraft,
  setSendMessageDraft,
  sendToEvelynFeedback,
  onSendMessage,
}: Props) {
  return (
    <>
      {showMessagesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowMessagesModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Messages</h3>
              <button type="button" onClick={() => setShowMessagesModal(false)} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {profileMessages.length === 0 ? (
                <p className="text-sm text-gray-500">No messages yet. Others can send you questions via &quot;Send to {sessionUserName || 'me'}&quot; on your profile.</p>
              ) : (
                profileMessages.map((m) => (
                  <div key={m.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                    <p className="text-gray-800 break-words">&quot;{m.text}&quot;</p>
                    <p className="mt-1 text-xs text-gray-500">{m.from?.name || 'Someone'} · {new Date(m.createdAt).toLocaleString()}</p>
                    <p className="mt-1.5 text-xs text-gray-500">You can answer it and add to the Q&A part.</p>
                    <button type="button" onClick={() => { onAnswerToQa(m.text); setShowMessagesModal(false) }} className="mt-2 text-xs font-medium text-teal-600 hover:text-teal-700 underline">
                      Answer & add to Q&A
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showPotentialConnectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPotentialConnectionModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">潜在合作</h3>
              <button type="button" onClick={() => setShowPotentialConnectionModal(false)} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="关闭">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {viewedPotentialConnections.length === 0 ? (
                <p className="text-sm text-gray-500">暂无。你看过的合作提示和别人发给你的 Engage 申请会显示在这里。</p>
              ) : (
                viewedPotentialConnections.map((v) => {
                  const linkUserId = /^[a-zA-Z0-9_-]+$/.test(v.targetUserId) ? v.targetUserId : v.targetUserId
                  return (
                    <a key={v.targetUserId} href={`/u/${linkUserId}`} className="flex flex-col gap-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{v.source === 'engage' ? 'Applicant' : 'TA'}：{v.targetName || 'Anonymous'}</p>
                        <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                      </div>
                      {v.source === 'engage' && <p className="text-[10px] text-teal-600 font-medium">New engage request</p>}
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>{v.hint}</p>
                        {v.possibleTopics && v.possibleTopics.length > 0 && (
                          <p className="text-[10px] text-gray-500">可能话题：{v.possibleTopics.slice(0, 3).join(' · ')}</p>
                        )}
                      </div>
                    </a>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {showSendMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !sendToEvelynFeedback && setShowSendMessageModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">发消息给 TA</h3>
              <button type="button" onClick={() => !sendToEvelynFeedback && (setShowSendMessageModal(false), setSendMessageDraft(''))} disabled={sendToEvelynFeedback === 'sending'} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50" aria-label="关闭">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={sendMessageDraft}
              onChange={(e) => setSendMessageDraft(e.target.value)}
              placeholder="输入你想问 TA 的内容…"
              className="w-full min-h-[100px] px-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 resize-none"
              maxLength={2000}
              disabled={sendToEvelynFeedback === 'sending'}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => !sendToEvelynFeedback && (setShowSendMessageModal(false), setSendMessageDraft(''))} disabled={sendToEvelynFeedback === 'sending'} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">
                取消
              </button>
              <button type="button" onClick={onSendMessage} disabled={!sendMessageDraft.trim() || sendToEvelynFeedback === 'sending'} className="px-4 py-1.5 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg disabled:opacity-50 disabled:pointer-events-none">
                {sendToEvelynFeedback === 'sending' ? '发送中…' : sendToEvelynFeedback === 'sent' ? '已发送 ✓' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
