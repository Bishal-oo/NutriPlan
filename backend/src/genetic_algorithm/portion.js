// Each entry: { min, max } = multiplier of the food's serving_size.
//   1.0 = one standard serving (the serving_size_grams in the foods table).
//   2.0 = double the standard serving.
// ------------------------------------------------------------------


export const PORTION_RULES = {
    // Staples- can be eaten in larger quantities
    grain: {min: 0.5 , max: 3.0},
    rice:        { min: 0.5, max: 2.5 },
    bread:       { min: 0.5, max: 2.0 },
    cereal:      { min: 0.5, max: 2.0 },
    pasta:       { min: 0.5, max: 2.0 },

    // Vegetables & fruit — generally unlimited
    vegetable:   { min: 0.5, max: 3.0 },
    fruit:       { min: 0.5, max: 3.0 },

    // Protein sources
    legume:      { min: 0.5, max: 2.5 },
    meat:        { min: 0.5, max: 2.5 },
    poultry:     { min: 0.5, max: 2.5 },
    fish:        { min: 0.5, max: 2.0 },
    seafood:     { min: 0.5, max: 2.0 },
    egg:         { min: 0.5, max: 3.0 },

    // Dairy
    dairy:       { min: 0.3, max: 2.0 },
    cheese:      { min: 0.2, max: 1.5 },
    yogurt:      { min: 0.5, max: 2.0 },

    // Nuts & seeds — calorie-dense, small quantities
    nut:         { min: 0.2, max: 1.0 },
    seed:        { min: 0.2, max: 1.0 },

    // Fats — very small quantities
    oil:         { min: 0.1, max: 0.5 },
    butter:      { min: 0.1, max: 0.5 },

    // Flavourings — tiny quantities
    condiment:   { min: 0.1, max: 0.5 },
    sauce:       { min: 0.2, max: 1.0 },
    spice:       { min: 0.05, max: 0.3 },
    herb:        { min: 0.05, max: 0.3 },
    sweetener:   { min: 0.1,  max: 0.5 },
    pickle:      { min: 0.05, max: 0.3 },

    // Other
    beverage:    { min: 0.5, max: 3.0 },
    snack:       { min: 0.5, max: 2.0 },
    dessert:     { min: 0.3, max: 1.5 },
    soup:        { min: 0.5, max: 2.0 },
    dal:         { min: 0.5, max: 2.5 },
    curry:       { min: 0.5, max: 2.0 },

    DEFAULT:     { min: 0.5, max: 2.0 },
}

/**
 * Get portion bounds for a food by category name from DB.
 * @param {string|null} category
 * @returns {{ min: number, max: number }}
 */
export const getPortionBounds = (category) => {
    if(!category) return PORTION_RULES.DEFAULT;

    const key = category.toLocaleLowerCase.trim();
    if(PORTION_RULES[key]) return PORTION_RULES[key];

    // Log unrecognised categories in dev so they can be added
    if (process.env.NODE_ENV !== 'production') {
        console.warn(`[portionRules] Unknown category: "${key}" — using DEFAULT bounds`);
    }
    return PORTION_RULES.DEFAULT;
}

/**
 * Generate a random valid serving count for a food's category.
 * @param {string|null} category
 * @returns {number}
 */
export const randomServingsForCategory=(category)=>{
    const { min , max} = getPortionBounds(category);
    return parseFloat((min + Math.random() * (max - min).toFixed(2)));
}

/**
 * Clamp a serving value to the category's allowed range.
 * @param {number} servings
 * @param {string|null} category
 * @returns {number}
 */
export function clampServings(servings, category) {
  const { min, max } = getPortionBounds(category);
  return parseFloat(Math.min(max, Math.max(min, servings)).toFixed(2));
}