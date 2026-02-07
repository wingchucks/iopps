
import { XMarkIcon } from "@heroicons/react/24/outline";

interface TrainingFiltersProps {
    filters: {
        search: string;
        category: string;
        format: string;
        costType: string;
        location: string;
    };
    onChange: (key: string, value: string) => void;
    onClear: () => void;
    hasActiveFilters: boolean;
}

const CATEGORIES = ["All", "Professional", "Trades", "Cultural", "Workplace"];
const FORMATS = ["All", "Online", "In-Person", "Hybrid", "Self-paced"];
const COSTS = ["All", "Free", "Paid", "Sponsored", "Funded"];

export default function TrainingFilters({ filters, onChange, onClear, hasActiveFilters }: TrainingFiltersProps) {
    return (
        <div className="rounded-2xl bg-surface backdrop-blur-sm border border-[var(--card-border)] p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Filter Programs</h3>
                {hasActiveFilters && (
                    <button
                        onClick={onClear}
                        className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-white transition-colors"
                    >
                        <XMarkIcon className="h-4 w-4" />
                        Clear all
                    </button>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Search */}
                <div>
                    <label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">Keywords</label>
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => onChange('search', e.target.value)}
                        placeholder="Search programs..."
                        className="w-full rounded-lg border border-[var(--card-border)] bg-slate-700/50 px-4 py-2.5 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">Category</label>
                    <select
                        value={filters.category}
                        onChange={(e) => onChange('category', e.target.value)}
                        className="w-full rounded-lg border border-[var(--card-border)] bg-slate-700/50 px-4 py-2.5 text-white focus:border-accent focus:outline-none appearance-none"
                    >
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat === 'All' ? '' : cat.toLowerCase()}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Format */}
                <div>
                    <label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">Format</label>
                    <div className="flex flex-wrap gap-2">
                        {FORMATS.map((fmt) => (
                            <button
                                key={fmt}
                                onClick={() => onChange('format', fmt === 'All' ? '' : fmt.toLowerCase())}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${(filters.format === fmt.toLowerCase() || (fmt === 'All' && !filters.format))
                                        ? "bg-accent text-white"
                                        : "bg-slate-700 text-[var(--text-secondary)] hover:bg-slate-600"
                                    }`}
                            >
                                {fmt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cost Type */}
                <div>
                    <label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">Cost</label>
                    <select
                        value={filters.costType}
                        onChange={(e) => onChange('costType', e.target.value)}
                        className="w-full rounded-lg border border-[var(--card-border)] bg-slate-700/50 px-4 py-2.5 text-white focus:border-accent focus:outline-none appearance-none"
                    >
                        {COSTS.map(cost => (
                            <option key={cost} value={cost === 'All' ? '' : cost.toLowerCase()}>{cost}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
