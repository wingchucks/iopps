export const dynamic = 'force-dynamic';
export async function GET() {
  const setting = process.env.IOPPS_MAINTENANCE_MODE;
  return Response.json({ status: setting === undefined || setting === 'off' ? 'active' : 'maintenance' }, { headers: { 'Cache-Control': 'no-store' } });
}
