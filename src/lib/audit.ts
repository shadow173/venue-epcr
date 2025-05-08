import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { headers } from 'next/headers';

type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
type AuditResource = 'USER' | 'EVENT' | 'VENUE' | 'PATIENT' | 'ASSESSMENT' | 'VITAL' | 'TREATMENT';

export async function logAudit(
  userId: string, 
  action: AuditAction, 
  resource: AuditResource, 
  resourceId?: string, 
  details?: Record<string, unknown> // Fixed: replaced 'any' with 'unknown'
) {
  try {
    const headersList = await headers(); // Fixed: added 'await'
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';
    
    await db.insert(auditLogs).values({
      // Fixed: removed 'id' as it's not in the schema or should be auto-generated
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date(), // Fixed: using Date object instead of ISO string
    });
  } catch (error) {
    console.error('Failed to log audit', error);
    // Don't throw - audit logging should not block main operation
  }
}