

import { KCAL_PER_GRAM } from './rdi.js';
import { getPortionBounds } from './portionRules.js';

const W = {
  hard_violation:       10_000,
  calorie_deviation:        10,
  macro_deviation:           8,
  micro_deficit:           2.5,
  micro_excess:            4.0,
  portion_violation:        50,
  category_missing:         25,
  single_category_excess:    4,
  duplicate_food:          100,
  too_few_foods:            80,
  too_many_foods:           30,
  liked_bonus:              15,
};

// Only penalise micros that fall below 60 % of their RDI.
// A diet that covers 70 % of every micro is nutritionally solid for a single day.
const MICRO_GRACE = 0.60;

const MICRO_DEFICIT_KEYS = [
  'vitamin_a','vitamin_c','vitamin_d','vitamin_b12','folate',
  'calcium','iron','magnesium','potassium','zinc',
];
const MICRO_EXCESS_KEYS = [
  'vitamin_a','vitamin_c','vitamin_d','folate',
  'calcium','iron','zinc','sodium','sugar',
];
const DIET_ALLOWED = {
  vegan:   ['vegan'],
  veg:     ['vegan','veg'],
  non_veg: ['vegan','veg','non_veg'],
};

export function evaluateFitness(chromosome, foodMap, constraints) {
  let penalty = 0;
  const { targetCalories, macroTargets, rdi, upperLimits,
          likedFoodIds, dietaryType, allergenKeywords=[], minFoods=4, maxFoods=10 } = constraints;
  const allowed = DIET_ALLOWED[dietaryType] ?? DIET_ALLOWED['non_veg'];
  const totals  = aggregateNutrients(chromosome, foodMap);

  // 1. Hard constraints
  for (const gene of chromosome) {
    const food = foodMap.get(gene.foodId);
    if (!food) { penalty += W.hard_violation; continue; }
    if (!allowed.includes(food.dietary_type)) penalty += W.hard_violation;
    if (allergenKeywords.length) {
      const nl = food.name.toLowerCase();
      const tags = (food.tags||[]).map(t=>t.toLowerCase());
      for (const kw of allergenKeywords)
        if (nl.includes(kw)||tags.some(t=>t.includes(kw))) penalty += W.hard_violation;
    }
  }

  // 2. Calorie accuracy
  if (targetCalories > 0) {
    const pct = Math.abs(totals.calories - targetCalories) / targetCalories * 100;
    penalty += W.calorie_deviation * pct;
  }

  // 3. Macro ratio accuracy
  if (macroTargets && Object.keys(macroTargets).length > 0) {
    const tmCal = totals.protein*KCAL_PER_GRAM.protein
                + totals.carbohydrates*KCAL_PER_GRAM.carbohydrates
                + totals.fat*KCAL_PER_GRAM.fat;
    if (tmCal > 0) {
      const actual = {
        protein:       totals.protein*KCAL_PER_GRAM.protein/tmCal,
        carbohydrates: totals.carbohydrates*KCAL_PER_GRAM.carbohydrates/tmCal,
        fat:           totals.fat*KCAL_PER_GRAM.fat/tmCal,
      };
      for (const m of ['protein','carbohydrates','fat']) {
        if (macroTargets[m]!=null)
          penalty += W.macro_deviation * Math.abs(actual[m]-macroTargets[m])*100;
      }
    }
  }

  // 4. Micro deficiency (below MICRO_GRACE of RDI)
  for (const key of MICRO_DEFICIT_KEYS) {
    const target = rdi?.[key]; if (!target) continue;
    const actual = totals[key]||0;
    const grace  = target * MICRO_GRACE;
    if (actual < grace) {
      const defPct = (grace - actual)/grace*100;
      penalty += W.micro_deficit * defPct;
    }
  }

  // 5. Micro excess
  for (const key of MICRO_EXCESS_KEYS) {
    const ul = upperLimits?.[key]; if (ul==null) continue;
    const actual = totals[key]||0;
    if (actual > ul) {
      const exPct = (actual - ul)/ul*100;
      penalty += W.micro_excess * exPct;
    }
  }

  // 6. Portion realism
  for (const gene of chromosome) {
    const food = foodMap.get(gene.foodId); if (!food) continue;
    const {min,max} = getPortionBounds(food.category);
    if (gene.servings<min||gene.servings>max) penalty += W.portion_violation;
  }

  // 7. Diversity
  const catCnt={};
  for (const gene of chromosome) {
    const food = foodMap.get(gene.foodId); if (!food) continue;
    const c=food.category||'unknown'; catCnt[c]=(catCnt[c]||0)+1;
  }
  const uCats = Object.keys(catCnt).length;
  if (uCats<3) penalty += W.category_missing*(3-uCats);
  for (const cnt of Object.values(catCnt)) if (cnt>2) penalty += W.single_category_excess*(cnt-2);

  // 8. Count bounds
  if (chromosome.length<minFoods) penalty += W.too_few_foods*(minFoods-chromosome.length);
  if (chromosome.length>maxFoods) penalty += W.too_many_foods*(chromosome.length-maxFoods);

  // 9. Duplicates
  const seen=new Set();
  for (const g of chromosome) { if(seen.has(g.foodId)) penalty+=W.duplicate_food; seen.add(g.foodId); }

  // 10. Liked bonus
  if (likedFoodIds?.size>0)
    for (const g of chromosome) if(likedFoodIds.has(g.foodId)) penalty-=W.liked_bonus;

  return Math.max(0, penalty);
}

export function aggregateNutrients(chromosome, foodMap) {
  const tot = {
    calories:0,protein:0,carbohydrates:0,fat:0,
    fiber:0,sugar:0,vitamin_a:0,vitamin_c:0,vitamin_d:0,
    vitamin_b12:0,folate:0,calcium:0,iron:0,magnesium:0,
    potassium:0,sodium:0,zinc:0,
  };
  for (const g of chromosome) {
    const food=foodMap.get(g.foodId); if(!food) continue;
    const scale=(parseFloat(food.serving_grams)||100)/100*g.servings;
    for (const k of Object.keys(tot)) tot[k]+=(parseFloat(food[k])||0)*scale;
  }
  return tot;
}