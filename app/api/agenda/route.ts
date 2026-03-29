import { NextResponse } from 'next/server'
import { getAgendaData } from '@/lib/agenda'

export function GET() {
  const data = getAgendaData()
  return NextResponse.json(data)
}
