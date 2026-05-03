import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check doctor role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role === 'staff') {
    return NextResponse.json(
      { error: 'Only doctors can use AI diagnosis' },
      { status: 403 }
    )
  }

  const { symptoms, patientId } = await req.json()
  if (!symptoms) {
    return NextResponse.json({ error: 'Symptoms required' }, { status: 400 })
  }

  // Fetch patient allergies for context
  let allergyContext = ''
  if (patientId) {
    const { data: patient } = await supabase
      .from('patients')
      .select('allergies')
      .eq('id', patientId)
      .single()
    if (patient?.allergies) {
      allergyContext = `\nKnown allergies: ${patient.allergies}`
    }
  }

  const systemPrompt = `You are a clinical assistant for a dental and cosmetology clinic in India.
Given symptoms, suggest possible diagnoses. Never diagnose definitively — always recommend doctor review.
Respond ONLY with valid JSON (no markdown, no explanation):
{
  "differentials": [
    {"name": "...", "likelihood": "high|medium|low", "notes": "..."}
  ],
  "suggestedNotes": "Brief clinical note template",
  "prescriptionSuggestions": ["Medicine 1 dosage", "Medicine 2 dosage"],
  "redFlags": ["..."]
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Symptoms: ${symptoms}${allergyContext}`,
        },
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Anthropic API error:', data)
    return NextResponse.json(
      { error: 'AI service error' },
      { status: 500 }
    )
  }

  try {
    const result = JSON.parse(data.content[0].text)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse AI response' },
      { status: 500 }
    )
  }
}
