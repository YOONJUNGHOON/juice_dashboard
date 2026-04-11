import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string | null)?.trim()
    const week = (formData.get('week') as string | null)?.trim() || null

    if (!file || !title) {
      return NextResponse.json({ error: '제목과 파일을 모두 입력해주세요' }, { status: 400 })
    }
    if (!week) {
      return NextResponse.json({ error: '회차(년/월)를 선택해주세요' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: '파일 크기는 50MB를 초과할 수 없습니다' }, { status: 400 })
    }

    // Storage path: ASCII-only (Supabase rejects non-ASCII keys)
    // Original filename is preserved in the DB for display
    const extRaw = file.name.includes('.') ? file.name.split('.').pop()! : ''
    const ext = extRaw.replace(/[^a-zA-Z0-9]/g, '') || 'bin'
    const filePath = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log('[upload] uploading', filePath, 'size:', buffer.length, 'type:', file.type)

    const { error: storageError } = await supabase.storage
      .from('uploads')
      .upload(filePath, buffer, { contentType: file.type || 'application/octet-stream', upsert: false })

    if (storageError) {
      console.error('[upload] storage error:', storageError)
      return NextResponse.json({ error: `스토리지 오류: ${storageError.message}` }, { status: 500 })
    }

    const { error: dbError } = await supabase.from('uploads').insert({
      week,
      title,
      uploader: session.name,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
    })

    if (dbError) {
      console.error('[upload] db error:', dbError)
      await supabase.storage.from('uploads').remove([filePath])
      return NextResponse.json({ error: `DB 오류: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[upload] unexpected error:', err)
    return NextResponse.json({ error: `서버 오류: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }
}
