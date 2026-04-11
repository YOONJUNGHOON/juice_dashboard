import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

const MAX_SIZE_BYTES = 50 * 1024 * 1024

// PATCH /api/uploads/[id] — edit title and optionally replace file
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Fetch existing record to verify ownership / get old file path
  const { data: existing } = await supabase
    .from('uploads')
    .select('id, file_path, uploader')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 })

  // Only uploader or admin can edit
  if (existing.uploader !== session.name && !session.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const title = (formData.get('title') as string | null)?.trim()
  const week = (formData.get('week') as string | null)?.trim() || null
  const file = formData.get('file') as File | null

  if (!title) return NextResponse.json({ error: '제목을 입력해주세요' }, { status: 400 })
  if (!week) return NextResponse.json({ error: '회차(년/월)를 선택해주세요' }, { status: 400 })

  let newFilePath = existing.file_path
  let newFileName: string | undefined
  let newFileSize: number | undefined

  // If a new file was provided, upload it and delete the old one
  if (file && file.size > 0) {
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: '파일 크기는 50MB를 초과할 수 없습니다' }, { status: 400 })
    }

    const extRaw = file.name.includes('.') ? file.name.split('.').pop()! : ''
    const ext = extRaw.replace(/[^a-zA-Z0-9]/g, '') || 'bin'
    newFilePath = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: storageError } = await supabase.storage
      .from('uploads')
      .upload(newFilePath, buffer, { contentType: file.type || 'application/octet-stream', upsert: false })

    if (storageError) {
      return NextResponse.json({ error: `스토리지 오류: ${storageError.message}` }, { status: 500 })
    }

    // Delete old file
    await supabase.storage.from('uploads').remove([existing.file_path])

    newFileName = file.name
    newFileSize = file.size
  }

  const { error: dbError } = await supabase
    .from('uploads')
    .update({
      week,
      title,
      file_path: newFilePath,
      ...(newFileName !== undefined && { file_name: newFileName }),
      ...(newFileSize !== undefined && { file_size: newFileSize }),
    })
    .eq('id', id)

  if (dbError) {
    return NextResponse.json({ error: `DB 오류: ${dbError.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/uploads/[id] — delete a file
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: existing } = await supabase
    .from('uploads')
    .select('id, file_path, uploader')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 })

  if (existing.uploader !== session.name && !session.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await supabase.storage.from('uploads').remove([existing.file_path])

  const { error } = await supabase.from('uploads').delete().eq('id', id)
  if (error) return NextResponse.json({ error: '삭제 실패' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
