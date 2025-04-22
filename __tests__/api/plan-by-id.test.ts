import { createMocks } from 'node-mocks-http'
import { GET } from '@/app/api/plans/[planId]/route'
import { WorkflowPersistenceService } from '@/lib/services/WorkflowPersistenceService'

jest.mock('@/lib/services/WorkflowPersistenceService')

describe('GET /api/plans/[planId]', () => {
  it('returns 404 if not found', async () => {
    (WorkflowPersistenceService as any).mockImplementation(() => ({
      getPlanById: jest.fn().mockResolvedValue(null)
    }))
    const req = {
      nextUrl: { search: '' }
    } as any
    const params = { planId: 'notfound' }
    const response = await GET(req, { params })
    expect(response.status).toBe(404)
  })
  it('returns plan if found', async () => {
    (WorkflowPersistenceService as any).mockImplementation(() => ({
      getPlanById: jest.fn().mockResolvedValue({ id: 'PLAN-1', status: 'draft', message: { data: { content: 'abc' } } })
    }))
    const req = {
      nextUrl: { search: '' }
    } as any
    const params = { planId: 'PLAN-1' }
    const response = await GET(req, { params })
    expect(response.status).toBe(200)
    const plan = await response.json()
    expect(plan.id).toBe('PLAN-1')
    expect(plan.message.data.content).toBe('abc')
  })
})
