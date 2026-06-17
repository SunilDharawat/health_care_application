import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, PanResponder,
} from 'react-native';
import { useAuthStore, useNutritionStore } from '../../store';
import { nutritionService } from '../../services/api';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import type { Meal } from '../../types';
import { format } from 'date-fns';
import { Sunrise, Sun, Moon, Apple, Plus, X } from 'lucide-react-native';

const MEAL_ICONS = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
  snack: Apple,
} as const;

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', color: Colors.nutrition.primary },
  { key: 'lunch',     label: 'Lunch',     color: Colors.hydration.primary },
  { key: 'dinner',    label: 'Dinner',    color: Colors.sleep.primary },
  { key: 'snack',     label: 'Snack',     color: Colors.habits.primary },
] as const;

export default function NutritionScreen({ navigation }: { navigation: any }) {
  const { user } = useAuthStore();

  // Swipe tab navigation gesture responder
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 80 && Math.abs(gestureState.dy) < 40;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 80) {
          // Swipe right navigates back to Habits
          navigation.navigate('Habits');
        }
      },
    })
  ).current;
  const { meals, todayTotals, setMeals, addMeal, setTotals } = useNutritionStore();
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [activeMealType, setActiveMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

  // New meal form state
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [todayMeals, totals] = await Promise.all([
        nutritionService.getTodayMeals(user.id),
        nutritionService.getTodayNutrition(user.id),
      ]);
      setMeals(todayMeals);
      setTotals(totals);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user, setMeals, setTotals]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = (type: typeof activeMealType) => {
    setActiveMealType(type);
    setShowAdd(true);
  };

  const resetForm = () => {
    setMealName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
  };

  const handleSave = async () => {
    if (!mealName.trim() || !user) return;
    setSaving(true);
    try {
      const meal = await nutritionService.logMeal(user.id, {
        meal_type: activeMealType,
        name: mealName.trim(),
        calories: parseInt(calories) || 0,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
        notes: '',
      });
      addMeal(meal);
      resetForm();
      setShowAdd(false);
    } catch {
      Alert.alert('Error', 'Could not log meal.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.nutrition.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Nutrition</Text>
            <Text style={styles.subtitle}>Awareness around what you eat</Text>
          </View>
        </View>

        {/* Daily totals */}
        <View style={styles.totalsCard}>
          <Text style={styles.totalsLabel}>TODAY'S TOTALS</Text>
          <Text style={styles.caloriesBig}>
            {todayTotals.calories}
            <Text style={styles.caloriesUnit}> kcal</Text>
          </Text>
          <View style={styles.macroRow}>
            <MacroPill label="Protein" value={todayTotals.protein_g} unit="g" color={Colors.hydration.primary} />
            <MacroPill label="Carbs"   value={todayTotals.carbs_g}   unit="g" color={Colors.nutrition.primary} />
            <MacroPill label="Fat"     value={todayTotals.fat_g}     unit="g" color={Colors.sleep.primary} />
          </View>
        </View>

        {/* Meal sections */}
        {MEAL_TYPES.map(mealType => {
          const typeMeals = meals.filter(m => m.meal_type === mealType.key);
          const IconComponent = MEAL_ICONS[mealType.key];
          return (
            <View key={mealType.key} style={styles.mealSection}>
              <View style={styles.mealSectionHeader}>
                <IconComponent size={20} color={mealType.color} style={{ marginRight: Spacing.sm }} />
                <Text style={styles.mealTypeLabel}>{mealType.label}</Text>
                <TouchableOpacity
                  style={[styles.addMealBtn, { borderColor: mealType.color }]}
                  onPress={() => openAdd(mealType.key)}
                >
                  <Plus size={12} color={mealType.color} style={{ marginRight: 4 }} />
                  <Text style={[styles.addMealBtnText, { color: mealType.color }]}>Add</Text>
                </TouchableOpacity>
              </View>

              {typeMeals.length === 0 ? (
                <Text style={styles.emptyMealText}>Nothing logged yet</Text>
              ) : (
                typeMeals.map((meal: Meal) => (
                  <View key={meal.id} style={styles.mealRow}>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName}>{meal.name}</Text>
                      <Text style={styles.mealTime}>{format(new Date(meal.logged_at), 'h:mm a')}</Text>
                    </View>
                    <View style={styles.mealMacros}>
                      {meal.calories > 0 && (
                        <Text style={styles.mealCal}>{meal.calories} kcal</Text>
                      )}
                      {meal.protein_g > 0 && (
                        <Text style={styles.mealMacro}>P {meal.protein_g}g</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Add Meal Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Log {MEAL_TYPES.find(m => m.key === activeMealType)?.label}
            </Text>
            <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }}>
              <X size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <FormField label="Food name *" value={mealName} onChange={setMealName} placeholder="e.g. Oatmeal with banana" />
            <FormField label="Calories (kcal)" value={calories} onChange={setCalories} placeholder="0" keyboard="numeric" />

            <Text style={styles.macroTitle}>Macros (optional)</Text>
            <View style={styles.macroInputRow}>
              <View style={styles.macroInput}>
                <FormField label="Protein (g)" value={protein} onChange={setProtein} placeholder="0" keyboard="numeric" />
              </View>
              <View style={styles.macroInput}>
                <FormField label="Carbs (g)" value={carbs} onChange={setCarbs} placeholder="0" keyboard="numeric" />
              </View>
              <View style={styles.macroInput}>
                <FormField label="Fat (g)" value={fat} onChange={setFat} placeholder="0" keyboard="numeric" />
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, !mealName.trim() && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!mealName.trim() || saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save meal</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function FormField({
  label, value, onChange, placeholder, keyboard = 'default',
}: {
  label: string; value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboard?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={styles.formInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.tertiary}
        keyboardType={keyboard}
      />
    </View>
  );
}

function MacroPill({ label, value, unit, color }: {
  label: string; value: number; unit: string; color: string;
}) {
  return (
    <View style={[styles.macroPill, { backgroundColor: `${color}15` }]}>
      <Text style={[styles.macroPillValue, { color }]}>{Math.round(value)}{unit}</Text>
      <Text style={styles.macroPillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: 100 },
  loadingContainer: { flex: 1, backgroundColor: Colors.bg.primary, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: Spacing.xl },
  title: { fontSize: Typography.size.xxl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  subtitle: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginTop: 4 },

  totalsCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: `${Colors.nutrition.primary}30`,
  },
  totalsLabel: { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, color: Colors.text.tertiary, letterSpacing: 1, marginBottom: Spacing.sm },
  caloriesBig: { fontSize: 52, fontWeight: Typography.weight.bold, color: Colors.nutrition.primary },
  caloriesUnit: { fontSize: Typography.size.lg, color: Colors.text.secondary },
  macroRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.base },
  macroPill: { flex: 1, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  macroPillValue: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  macroPillLabel: { fontSize: Typography.size.xs, color: Colors.text.tertiary, marginTop: 2 },

  mealSection: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  mealSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  mealTypeLabel: { flex: 1, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  addMealBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addMealBtnText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },
  emptyMealText: { color: Colors.text.tertiary, fontSize: Typography.size.sm, paddingVertical: Spacing.sm },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.bg.border,
  },
  mealInfo: {},
  mealName: { color: Colors.text.primary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  mealTime: { color: Colors.text.tertiary, fontSize: Typography.size.xs, marginTop: 2 },
  mealMacros: { alignItems: 'flex-end' },
  mealCal: { color: Colors.nutrition.primary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  mealMacro: { color: Colors.text.tertiary, fontSize: Typography.size.xs },

  modal: { flex: 1, backgroundColor: Colors.bg.primary, padding: Spacing.xl, paddingTop: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  modalClose: { color: Colors.text.secondary, fontSize: Typography.size.lg },
  macroTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  macroInputRow: { flexDirection: 'row', gap: Spacing.sm },
  macroInput: { flex: 1 },
  formField: { marginBottom: Spacing.base },
  formLabel: { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.xs },
  formInput: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.base,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  saveBtn: {
    backgroundColor: Colors.nutrition.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: Colors.bg.primary, fontWeight: Typography.weight.bold, fontSize: Typography.size.base },
});
