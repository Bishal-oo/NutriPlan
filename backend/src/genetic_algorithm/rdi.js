// Foundation layer. Every other component depends on the value computetd form it.

export const KACL_PER_GRAM ={
    protein: 4,
    carbohydrates: 4,
    fat: 9,
}

export const MACRO_RATIOS = {
    mucscle_gain: {
        protein: 0.30, carbohydrates: 0.45, fat: 0.25 
    },
    weight_loss : {
        protein: 0.35, carbohydrates: 0.35, fat: 0.30 
    },
    maintain : {
        protein: 0.25, carbohydrates: 0.50, fat: 0.25 
    },
    endurance: {
        protein: 0.20, carbohydrates: 0.60, fat: 0.20
    }
}

const ACTIVITY_MULTIPLIERS = {
  sedentary:   1.2,    // desk job, no exercise
  light:       1.375,  // light exercise 1–3 days/week
  moderate:    1.55,   // moderate exercise 3–5 days/week
  active:      1.725,  // hard exercise 6–7 days/week
  very_active: 1.9,    // physical job + hard exercise
}

/**
 * Compute Basal Metabolic Rate (Mifflin-St Jeor equation).
 * @param {{ age: number, gender: 'male'|'female', weightKg: number, heightCm: number }} profile
 * @returns {number} kcal/day
 */
export const computeBMR = ({age, gender, weightKg, heightCm}) =>{
    const base = 10*weightKg+6.25 *heightCm - 5 * age;
    return gender === 'female' ? base -161 : base + 5;
}

/**
 * Compute Total Daily Energy Expenditure.
 * @param {{ age, gender, weightKg, heightCm, activityLevel }} profile
 * @returns {number} kcal/day
 */
export const computeTDEE = (profile)=>{
    const bmr = computeBMR(profile);
    const mul = ACTIVITY_MULTIPLIERS[profile.activityLevel] ?? ACTIVITY_MULTIPLIERS.moderate;

    return Math.round(bmr * mul)
}

/**
 * Compute daily calorie target from TDEE + goal adjustment.
 * Used as a fallback if the user doesn't provide targetCalories.
 * @param {{ age, gender, weightKg, heightCm, activityLevel }} profile
 * @param {'muscle_gain'|'weight_loss'|'maintain'|'endurance'} goal
 * @returns {number} kcal/day
 */
export const computeTargetCalories = (profile, goal) =>{
    const tdee = computeTDEE(profile);
    switch (goal) {
        case 'weight_loss': return Math.max(1200, Math.round(tdee - 500));
        case 'muscle_gain':  return Math.round(tdee + 300);
        default : return tdee;
        
    }
}

/**
 * Compute dynamic RDI based on user profile.
 * Returns an object with the same shape expected by the GA fitness function.
 *
 * @param {{ age: number, gender: 'male'|'female' }} profile
 * @returns {object}
 */
export const computeRDI = ({age, gender})=>{
    const isMale = gender === 'male'

    const rdi = {
        // Macros (grams) — minimums for general health
        protein:       isMale ? 56 : 46,
        carbohydrates: 275,
        fat:           78,
        fiber:         isMale ? 38 : 25,
        sugar:         50,      // UPPER LIMIT (not a minimum)

        // Vitamins
        vitamin_a:   isMale ? 900 : 700,    // mcg RAE
        vitamin_c:   isMale ? 90  : 75,     // mg
        vitamin_d:   age >= 70 ? 20 : 15,   // mcg
        vitamin_b12: 2.4,                   // mcg
        folate:      400,                    // mcg DFE

        // Minerals (mg)
        calcium:   age >= 50 ? 1200 : 1000,
        iron:      (isMale || age >= 51) ? 8 : 18,
        magnesium: isMale ? 420 : 320,
        potassium: isMale ? 3400 : 2600,
        sodium:    2300,                     // UPPER LIMIT
        zinc:      isMale ? 11 : 8,
    };

    // Teenage adjustments (14–18)
    if (age >= 14 && age <= 18) {
        rdi.calcium   = 1300;
        rdi.iron      = isMale ? 11 : 15;
        rdi.magnesium = isMale ? 410 : 360;
        rdi.zinc      = isMale ? 11 : 9;
    }

    return rdi;
}

/**
 * Compute Tolerable Upper Intake Levels (ULs).
 * The fitness function penalises exceeding these.
 * null = no established UL (no penalty applied).
 *
 * @param {{ age: number, gender: 'male'|'female' }} profile
 * @returns {object}
 */
export const computeUpperLimits = ({age, gender}) =>{
    return {
        vitamin_a:   3000,   // mcg — liver toxicity
        vitamin_c:   2000,   // mg  — GI distress
        vitamin_d:   100,    // mcg — hypercalcaemia
        vitamin_b12: null,   // no established UL
        folate:      1000,   // mcg — masks B12 deficiency
        calcium:     2500,   // mg
        iron:        45,     // mg
        magnesium:   350,    // mg (supplement-sourced; food-only has no UL)
        potassium:   null,   // no established UL from food
        sodium:      2300,   // mg (this is also the RDI upper limit)
        zinc:        40,     // mg
        sugar:       50,     // g (WHO recommendation)
    }
}

// Default
export const RDI = computeRDI({age: 30, gender: 'male'})