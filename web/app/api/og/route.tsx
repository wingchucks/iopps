import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Content type configurations
const typeConfig: Record<string, { color: string; gradient: string; label: string }> = {
  business: {
    color: '#14B8A6',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #10B981 100%)',
    label: 'Business',
  },
  product: {
    color: '#14B8A6',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #059669 100%)',
    label: 'Product',
  },
  service: {
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
    label: 'Service',
  },
  job: {
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    label: 'Job Opportunity',
  },
  scholarship: {
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
    label: 'Scholarship',
  },
  conference: {
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    label: 'Conference',
  },
  event: {
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    label: 'Event',
  },
  powwow: {
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    label: 'Pow Wow',
  },
  employer: {
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    label: 'Employer',
  },
  school: {
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    label: 'School',
  },
  program: {
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    label: 'Program',
  },
  grant: {
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    label: 'Grant',
  },
  live: {
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    label: 'Live',
  },
  training: {
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
    label: 'Training',
  },
  default: {
    color: '#14B8A6',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #10B981 100%)',
    label: '',
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get('title') || 'IOPPS.ca';
  const subtitle = searchParams.get('subtitle') || '';
  const type = searchParams.get('type') || 'default';
  const imageUrl = searchParams.get('image') || '';

  const config = typeConfig[type] || typeConfig.default;

  // Truncate title if too long
  const displayTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
  const displaySubtitle = subtitle.length > 100 ? subtitle.substring(0, 97) + '...' : subtitle;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#020617',
          position: 'relative',
        }}
      >
        {/* Background gradient overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(ellipse at top right, rgba(20, 184, 166, 0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
          }}
        />

        {/* Grid pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: '60px',
            position: 'relative',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '40px',
            }}
          >
            {/* Logo section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              {/* Logo circle */}
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #14B8A6 0%, #10B981 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'white',
                }}
              >
                I
              </div>
              <span
                style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#E2E8F0',
                  letterSpacing: '0.05em',
                }}
              >
                IOPPS
              </span>
            </div>

            {/* Type badge */}
            {config.label && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: config.gradient,
                  padding: '10px 24px',
                  borderRadius: '50px',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'white',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {config.label}
              </div>
            )}
          </div>

          {/* Main content area */}
          <div
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              gap: '50px',
            }}
          >
            {/* Image preview if provided */}
            {imageUrl && (
              <div
                style={{
                  width: '280px',
                  height: '280px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  border: `3px solid ${config.color}`,
                  boxShadow: `0 0 60px ${config.color}30`,
                  display: 'flex',
                  flexShrink: 0,
                }}
              >
                <img
                  src={imageUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            )}

            {/* Text content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                flex: 1,
              }}
            >
              {/* Title */}
              <h1
                style={{
                  fontSize: imageUrl ? '48px' : '64px',
                  fontWeight: 'bold',
                  color: '#F8FAFC',
                  lineHeight: 1.1,
                  margin: 0,
                  textShadow: '0 2px 20px rgba(0,0,0,0.3)',
                }}
              >
                {displayTitle}
              </h1>

              {/* Subtitle */}
              {displaySubtitle && (
                <p
                  style={{
                    fontSize: '26px',
                    color: '#94A3B8',
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {displaySubtitle}
                </p>
              )}

              {/* Accent line */}
              <div
                style={{
                  width: '120px',
                  height: '4px',
                  background: config.gradient,
                  borderRadius: '2px',
                  marginTop: '10px',
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'auto',
              paddingTop: '30px',
              borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            }}
          >
            <span
              style={{
                fontSize: '20px',
                color: '#64748B',
              }}
            >
              Empowering Indigenous Success
            </span>
            <span
              style={{
                fontSize: '22px',
                color: '#14B8A6',
                fontWeight: '600',
              }}
            >
              iopps.ca
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
