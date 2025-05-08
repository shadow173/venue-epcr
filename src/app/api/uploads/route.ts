// src/app/api/uploads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateS3Key, uploadToS3 } from '@/lib/s3';
import { logAudit } from '@/lib/audit';

// POST - Handle file uploads
export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Generate S3 key based on folder type
    const folderType = formData.get('folderType') as string || 'general';
    const s3Key = generateS3Key(folderType, file.name);
    
    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to S3
    const fileUrl = await uploadToS3(buffer, file.type, s3Key);
    
    // Using a valid AuditResource type from the available options
    await logAudit(session.user.id, 'CREATE', 'PATIENT', undefined, {
      filename: file.name,
      fileType: file.type,
      s3Key,
    });
    
    return NextResponse.json({
      url: fileUrl,
      key: s3Key,
      filename: file.name,
      contentType: file.type,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}