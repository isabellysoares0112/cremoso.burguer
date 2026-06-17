import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabaseAdmin.storage
      .from('produtos')
      .upload(path, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: pub } = supabaseAdmin.storage.from('produtos').getPublicUrl(path)
    return NextResponse.json({ url: pub.publicUrl, path })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
