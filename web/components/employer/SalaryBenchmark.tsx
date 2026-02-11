'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline';

interface SalaryBenchmarkProps {
  employmentType?: string;
  location?: string;
  currentMin?: number;
  currentMax?: number;
  category?: string;
}

interface BenchmarkData {
  avgMin: number;
  avgMax: number;
  count: number;
  percentile: 'below' | 'average' | 'above' | 'top';
}

export function SalaryBenchmark({
  employmentType,
  location,
  currentMin,
  currentMax,
  category,
}: SalaryBenchmarkProps) {
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchBenchmark() {
      if (!db || !employmentType) return;
      
      setLoading(true);
      try {
        // Query similar jobs
        const constraints = [
          where('active', '==', true),
          where('employmentType', '==', employmentType),
        ];
        
        // Add location filter if provided (province level)
        if (location) {
          const province = extractProvince(location);
          if (province) {
            // Can't easily filter by province in Firestore, will filter client-side
          }
        }

        const q = query(
          collection(db, 'jobPostings'),
          ...constraints,
          limit(100)
        );

        const snapshot = await getDocs(q);
        
        // Filter and calculate averages
        const salaries: { min: number; max: number }[] = [];
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const salary = data.salaryRange;
          
          if (salary && typeof salary === 'object') {
            if (salary.min || salary.max) {
              salaries.push({
                min: salary.min || salary.max || 0,
                max: salary.max || salary.min || 0,
              });
            }
          }
        });

        if (salaries.length < 3) {
          setBenchmark(null);
          return;
        }

        // Calculate averages
        const avgMin = Math.round(salaries.reduce((sum, s) => sum + s.min, 0) / salaries.length);
        const avgMax = Math.round(salaries.reduce((sum, s) => sum + s.max, 0) / salaries.length);

        // Determine percentile
        let percentile: BenchmarkData['percentile'] = 'average';
        const currentMid = ((currentMin || 0) + (currentMax || 0)) / 2;
        const avgMid = (avgMin + avgMax) / 2;

        if (currentMid > 0) {
          const diff = (currentMid - avgMid) / avgMid;
          if (diff < -0.15) percentile = 'below';
          else if (diff > 0.25) percentile = 'top';
          else if (diff > 0.1) percentile = 'above';
        }

        setBenchmark({
          avgMin,
          avgMax,
          count: salaries.length,
          percentile,
        });
      } catch (error) {
        console.error('Error fetching salary benchmark:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBenchmark();
  }, [employmentType, location, category, currentMin, currentMax]);

  if (loading) {
    return (
      <div className="mt-3 p-3 bg-surface rounded-lg border border-[var(--card-border)] animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-3/4"></div>
      </div>
    );
  }

  if (!benchmark || !currentMin) return null;

  const formatSalary = (num: number) => {
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toLocaleString()}`;
  };

  const getPercentileInfo = () => {
    switch (benchmark.percentile) {
      case 'below':
        return {
          icon: ArrowTrendingDownIcon,
          color: 'text-amber-400',
          bgColor: 'bg-amber-900/20 border-amber-800/30',
          message: 'Below market average. Consider increasing to attract more candidates.',
        };
      case 'above':
        return {
          icon: ArrowTrendingUpIcon,
          color: 'text-green-400',
          bgColor: 'bg-green-900/20 border-green-800/30',
          message: 'Above market average. Great for attracting top talent!',
        };
      case 'top':
        return {
          icon: ArrowTrendingUpIcon,
          color: 'text-teal-400',
          bgColor: 'bg-teal-900/20 border-teal-800/30',
          message: 'Top tier salary! Expect strong candidate interest.',
        };
      default:
        return {
          icon: MinusIcon,
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/20 border-blue-800/30',
          message: 'Competitive with market average.',
        };
    }
  };

  const info = getPercentileInfo();
  const Icon = info.icon;

  return (
    <div className={`mt-3 p-3 rounded-lg border ${info.bgColor}`}>
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-lg ${info.bgColor}`}>
          <ChartBarIcon className={`w-4 h-4 ${info.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground">Salary Benchmark</span>
            <Icon className={`w-4 h-4 ${info.color}`} />
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-2">
            Based on {benchmark.count} similar {employmentType?.toLowerCase()} jobs
          </p>
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-[var(--text-muted)]">Market avg:</span>{' '}
              <span className="text-foreground font-medium">
                {formatSalary(benchmark.avgMin)} – {formatSalary(benchmark.avgMax)}
              </span>
            </div>
          </div>
          <p className={`text-xs mt-2 ${info.color}`}>
            {info.message}
          </p>
        </div>
      </div>
    </div>
  );
}

function extractProvince(location: string): string | null {
  const provinces: Record<string, string> = {
    'AB': 'Alberta', 'Alberta': 'Alberta',
    'BC': 'British Columbia', 'British Columbia': 'British Columbia',
    'MB': 'Manitoba', 'Manitoba': 'Manitoba',
    'SK': 'Saskatchewan', 'Saskatchewan': 'Saskatchewan',
    'ON': 'Ontario', 'Ontario': 'Ontario',
    'QC': 'Quebec', 'Quebec': 'Quebec',
  };
  
  for (const [abbr, full] of Object.entries(provinces)) {
    if (location.includes(abbr) || location.includes(full)) {
      return full;
    }
  }
  return null;
}
