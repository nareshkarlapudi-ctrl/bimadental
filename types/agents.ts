export type UserRole = 'admin' | 'doctor' | 'staff'

export interface AgentContext {
  userId: string
  role: UserRole
  patientId?: string
  visitId?: string
  timestamp: string
  sessionId: string
}

export interface OrchestratorInput {
  message: string
  userId: string
  role: UserRole
  sessionId: string
  patientId?: string
  visitId?: string
  attachments?: string[]
}

export interface Intent {
  domain: 'patient' | 'clinical' | 'billing' | 'ops' | 'unknown'
  action?: string
  entities: Record<string, unknown>
  confidence: number
}

export interface AgentResponse {
  ok: boolean
  agent: string
  message?: string
  error?: string
  action?: string
  data?: unknown
  warnings?: string[]
  disclaimer?: string
  suggestions?: string[]
}
