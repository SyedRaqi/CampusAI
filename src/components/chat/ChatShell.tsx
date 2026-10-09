import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Conversation } from '../../types'
import { listConversations } from '../../services/conversationService'
import ConversationList from './ConversationList'
import ChatWindow from './ChatWindow'
export default function ChatShell(){const [conversations,setConversations]=useState<Conversation[]>([]);const [selected,setSelected]=useState<Conversation|null>(null);const [params]=useSearchParams();useEffect(()=>{listConversations().then(rows=>{setConversations(rows);const id=params.get('conversation');setSelected(rows.find(row=>row.id===id)||rows[0]||null)}).catch(()=>setConversations([]))},[params]);return <div className="chat-shell"><ConversationList conversations={conversations} selectedId={selected?.id} onSelect={id=>setSelected(conversations.find(row=>row.id===id)||null)}/><ChatWindow conversation={selected}/><aside className="chat-details"><p className="eyebrow">Conversation</p><h3>{selected?.name||'No conversation selected'}</h3><p>Private members-only chat with Realtime updates.</p></aside></div>}
