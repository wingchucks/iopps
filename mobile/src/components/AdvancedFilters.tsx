import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Switch,
} from 'react-native';
import {
  JobFilters,
  RemoteWorkOption,
  JobTypeOption,
  ExperienceLevelOption,
  PostedDateOption,
} from '../hooks/useJobFilters';

interface AdvancedFiltersProps {
  visible: boolean;
  onClose: () => void;
  filters: JobFilters;
  onApply: (filters: JobFilters) => void;
  onClear: () => void;
}

const SALARY_MIN = 0;
const SALARY_MAX = 200000;
const SALARY_STEP = 5000;

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Education',
  'Government',
  'Non-Profit',
  'Construction',
  'Hospitality',
  'Retail',
  'Finance',
  'Manufacturing',
  'Arts & Culture',
  'Legal',
  'Energy',
  'Transportation',
  'Other',
];

/**
 * Advanced Filters Modal for Job Search
 * - Provides comprehensive filtering options
 * - Dark theme styled (#0F172A, #14B8A6)
 * - Bottom sheet style modal
 */
export function AdvancedFilters({
  visible,
  onClose,
  filters,
  onApply,
  onClear,
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<JobFilters>(filters);

  const updateFilter = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = <T,>(array: T[], item: T): T[] => {
    if (array.includes(item)) {
      return array.filter((i) => i !== item);
    }
    return [...array, item];
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleClear = () => {
    onClear();
    onClose();
  };

  // Calculate salary ranges for display
  const getSalaryDisplay = () => {
    const min = localFilters.salaryMin ?? SALARY_MIN;
    const max = localFilters.salaryMax ?? SALARY_MAX;
    return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Advanced Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Salary Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Salary Range</Text>
              <Text style={styles.salaryDisplay}>{getSalaryDisplay()}</Text>

              <View style={styles.salaryInputRow}>
                <View style={styles.salaryInputContainer}>
                  <Text style={styles.inputLabel}>Min</Text>
                  <TouchableOpacity
                    style={styles.salaryButton}
                    onPress={() => {
                      const current = localFilters.salaryMin ?? SALARY_MIN;
                      const newValue = Math.max(SALARY_MIN, current - SALARY_STEP);
                      updateFilter('salaryMin', newValue);
                    }}
                  >
                    <Text style={styles.salaryButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.salaryValue}>
                    ${((localFilters.salaryMin ?? SALARY_MIN) / 1000).toFixed(0)}k
                  </Text>
                  <TouchableOpacity
                    style={styles.salaryButton}
                    onPress={() => {
                      const current = localFilters.salaryMin ?? SALARY_MIN;
                      const newValue = Math.min(SALARY_MAX, current + SALARY_STEP);
                      updateFilter('salaryMin', newValue);
                    }}
                  >
                    <Text style={styles.salaryButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.salaryInputContainer}>
                  <Text style={styles.inputLabel}>Max</Text>
                  <TouchableOpacity
                    style={styles.salaryButton}
                    onPress={() => {
                      const current = localFilters.salaryMax ?? SALARY_MAX;
                      const newValue = Math.max(SALARY_MIN, current - SALARY_STEP);
                      updateFilter('salaryMax', newValue);
                    }}
                  >
                    <Text style={styles.salaryButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.salaryValue}>
                    ${((localFilters.salaryMax ?? SALARY_MAX) / 1000).toFixed(0)}k
                  </Text>
                  <TouchableOpacity
                    style={styles.salaryButton}
                    onPress={() => {
                      const current = localFilters.salaryMax ?? SALARY_MAX;
                      const newValue = Math.min(SALARY_MAX, current + SALARY_STEP);
                      updateFilter('salaryMax', newValue);
                    }}
                  >
                    <Text style={styles.salaryButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Remote Work */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Remote Work</Text>
              <View style={styles.chipContainer}>
                {(['remote', 'hybrid', 'on-site'] as RemoteWorkOption[]).map((option) => (
                  <Chip
                    key={option}
                    label={option.charAt(0).toUpperCase() + option.slice(1)}
                    selected={localFilters.remoteWork.includes(option)}
                    onPress={() =>
                      updateFilter(
                        'remoteWork',
                        toggleArrayItem(localFilters.remoteWork, option)
                      )
                    }
                  />
                ))}
              </View>
            </View>

            {/* Job Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Type</Text>
              <View style={styles.checkboxContainer}>
                {(['full-time', 'part-time', 'contract', 'internship'] as JobTypeOption[]).map(
                  (option) => (
                    <CheckboxItem
                      key={option}
                      label={option
                        .split('-')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join('-')}
                      checked={localFilters.jobTypes.includes(option)}
                      onPress={() =>
                        updateFilter('jobTypes', toggleArrayItem(localFilters.jobTypes, option))
                      }
                    />
                  )
                )}
              </View>
            </View>

            {/* Experience Level */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Experience Level</Text>
              <View style={styles.chipContainer}>
                {(['entry', 'mid', 'senior', 'executive'] as ExperienceLevelOption[]).map(
                  (option) => (
                    <Chip
                      key={option}
                      label={option.charAt(0).toUpperCase() + option.slice(1)}
                      selected={localFilters.experienceLevel.includes(option)}
                      onPress={() =>
                        updateFilter(
                          'experienceLevel',
                          toggleArrayItem(localFilters.experienceLevel, option)
                        )
                      }
                    />
                  )
                )}
              </View>
            </View>

            {/* Posted Date */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Posted Date</Text>
              <View style={styles.chipContainer}>
                {([
                  { value: '24h', label: 'Last 24 hours' },
                  { value: '7days', label: 'Last 7 days' },
                  { value: '30days', label: 'Last 30 days' },
                  { value: 'any', label: 'Any time' },
                ] as { value: PostedDateOption; label: string }[]).map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    selected={localFilters.postedDate === option.value}
                    onPress={() => updateFilter('postedDate', option.value)}
                  />
                ))}
              </View>
            </View>

            {/* Indigenous-Owned Employer */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabel}>
                  <Text style={styles.sectionTitle}>Indigenous-Owned Employer</Text>
                  <Text style={styles.toggleDescription}>
                    Show only jobs from Indigenous-owned organizations
                  </Text>
                </View>
                <Switch
                  value={localFilters.indigenousOwnedOnly}
                  onValueChange={(value) => updateFilter('indigenousOwnedOnly', value)}
                  trackColor={{ false: '#334155', true: '#14B8A6' }}
                  thumbColor="#F8FAFC"
                />
              </View>
            </View>

            {/* Industry/Category */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Industry</Text>
              <View style={styles.chipContainer}>
                {INDUSTRIES.map((industry) => (
                  <Chip
                    key={industry}
                    label={industry}
                    selected={localFilters.industries.includes(industry)}
                    onPress={() =>
                      updateFilter(
                        'industries',
                        toggleArrayItem(localFilters.industries, industry)
                      )
                    }
                  />
                ))}
              </View>
            </View>

            {/* Bottom spacing */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Chip Component
interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Checkbox Item Component
interface CheckboxItemProps {
  label: string;
  checked: boolean;
  onPress: () => void;
}

function CheckboxItem({ label, checked, onPress }: CheckboxItemProps) {
  return (
    <TouchableOpacity style={styles.checkboxItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  salaryDisplay: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14B8A6',
    marginBottom: 16,
    textAlign: 'center',
  },
  salaryInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  salaryInputContainer: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    textAlign: 'center',
  },
  salaryButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#14B8A6',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 'auto',
  },
  salaryButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  salaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    textAlign: 'center',
    marginVertical: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipSelected: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  chipTextSelected: {
    color: '#0F172A',
  },
  checkboxContainer: {
    gap: 12,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#F8FAFC',
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
  },
  toggleLabel: {
    flex: 1,
    marginRight: 12,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#14B8A6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
});
