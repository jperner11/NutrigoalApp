/**
 * Grocery list utilities — aggregate meal plan ingredients into a shopping list.
 */

export interface GroceryItem {
  name: string
  totalAmount: number
  unit: string
  category: string
}

const CATEGORY_MAP: Record<string, string> = {
  // Proteins
  'chicken': 'Protein', 'chicken breast': 'Protein', 'turkey': 'Protein', 'beef': 'Protein',
  'ground beef': 'Protein', 'steak': 'Protein', 'salmon': 'Protein', 'tuna': 'Protein',
  'shrimp': 'Protein', 'cod': 'Protein', 'tilapia': 'Protein', 'pork': 'Protein',
  'bacon': 'Protein', 'ham': 'Protein', 'lamb': 'Protein', 'tofu': 'Protein',
  'tempeh': 'Protein', 'eggs': 'Protein', 'egg': 'Protein', 'egg whites': 'Protein',
  'whey protein': 'Protein', 'protein powder': 'Protein', 'cottage cheese': 'Dairy',
  'fish': 'Protein', 'sardines': 'Protein', 'mackerel': 'Protein',

  // Dairy
  'milk': 'Dairy', 'whole milk': 'Dairy', 'skim milk': 'Dairy', 'yogurt': 'Dairy',
  'greek yogurt': 'Dairy', 'cheese': 'Dairy', 'mozzarella': 'Dairy', 'parmesan': 'Dairy',
  'cheddar': 'Dairy', 'cream cheese': 'Dairy', 'butter': 'Dairy', 'cream': 'Dairy',
  'sour cream': 'Dairy',

  // Grains & Carbs
  'rice': 'Grains & Carbs', 'brown rice': 'Grains & Carbs', 'white rice': 'Grains & Carbs',
  'oats': 'Grains & Carbs', 'oatmeal': 'Grains & Carbs', 'pasta': 'Grains & Carbs',
  'bread': 'Grains & Carbs', 'whole wheat bread': 'Grains & Carbs', 'tortilla': 'Grains & Carbs',
  'quinoa': 'Grains & Carbs', 'couscous': 'Grains & Carbs', 'cereal': 'Grains & Carbs',
  'granola': 'Grains & Carbs', 'flour': 'Grains & Carbs', 'bagel': 'Grains & Carbs',
  'noodles': 'Grains & Carbs', 'sweet potato': 'Grains & Carbs', 'potato': 'Grains & Carbs',
  'potatoes': 'Grains & Carbs',

  // Fruits
  'banana': 'Fruits', 'apple': 'Fruits', 'orange': 'Fruits', 'berries': 'Fruits',
  'blueberries': 'Fruits', 'strawberries': 'Fruits', 'raspberries': 'Fruits',
  'mango': 'Fruits', 'pineapple': 'Fruits', 'grapes': 'Fruits', 'avocado': 'Fruits',
  'lemon': 'Fruits', 'lime': 'Fruits', 'peach': 'Fruits', 'pear': 'Fruits',
  'watermelon': 'Fruits', 'kiwi': 'Fruits', 'cherries': 'Fruits', 'dates': 'Fruits',

  // Vegetables
  'broccoli': 'Vegetables', 'spinach': 'Vegetables', 'kale': 'Vegetables',
  'lettuce': 'Vegetables', 'tomato': 'Vegetables', 'tomatoes': 'Vegetables',
  'onion': 'Vegetables', 'onions': 'Vegetables', 'garlic': 'Vegetables',
  'peppers': 'Vegetables', 'bell pepper': 'Vegetables', 'cucumber': 'Vegetables',
  'carrot': 'Vegetables', 'carrots': 'Vegetables', 'celery': 'Vegetables',
  'zucchini': 'Vegetables', 'mushrooms': 'Vegetables', 'asparagus': 'Vegetables',
  'green beans': 'Vegetables', 'peas': 'Vegetables', 'corn': 'Vegetables',
  'cauliflower': 'Vegetables', 'cabbage': 'Vegetables', 'eggplant': 'Vegetables',
  'sweet corn': 'Vegetables', 'mixed vegetables': 'Vegetables',

  // Nuts & Seeds
  'almonds': 'Nuts & Seeds', 'walnuts': 'Nuts & Seeds', 'cashews': 'Nuts & Seeds',
  'peanuts': 'Nuts & Seeds', 'pecans': 'Nuts & Seeds', 'chia seeds': 'Nuts & Seeds',
  'flax seeds': 'Nuts & Seeds', 'sunflower seeds': 'Nuts & Seeds',
  'pumpkin seeds': 'Nuts & Seeds', 'mixed nuts': 'Nuts & Seeds',

  // Oils & Fats
  'olive oil': 'Oils & Fats', 'coconut oil': 'Oils & Fats', 'avocado oil': 'Oils & Fats',
  'vegetable oil': 'Oils & Fats', 'sesame oil': 'Oils & Fats',

  // Condiments & Sauces
  'peanut butter': 'Condiments', 'almond butter': 'Condiments', 'honey': 'Condiments',
  'maple syrup': 'Condiments', 'soy sauce': 'Condiments', 'hot sauce': 'Condiments',
  'mustard': 'Condiments', 'ketchup': 'Condiments', 'mayo': 'Condiments',
  'mayonnaise': 'Condiments', 'salsa': 'Condiments', 'vinegar': 'Condiments',
  'bbq sauce': 'Condiments',

  // Legumes
  'lentils': 'Legumes', 'chickpeas': 'Legumes', 'black beans': 'Legumes',
  'kidney beans': 'Legumes', 'beans': 'Legumes', 'hummus': 'Legumes',

  // Beverages
  'coffee': 'Beverages', 'tea': 'Beverages', 'juice': 'Beverages',
  'protein shake': 'Beverages', 'smoothie': 'Beverages',
}

const CATEGORY_ORDER = [
  'Protein', 'Dairy', 'Grains & Carbs', 'Fruits', 'Vegetables',
  'Nuts & Seeds', 'Legumes', 'Oils & Fats', 'Condiments', 'Beverages', 'Other',
]

export function categorizeIngredient(name: string): string {
  const lower = name.toLowerCase().trim()

  // Exact match
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower]

  // Partial match
  for (const [key, category] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return category
  }

  return 'Other'
}

interface RawIngredient {
  name: string
  amount: number
  unit: string
}

export function aggregateIngredients(ingredientsByDay: RawIngredient[][]): GroceryItem[] {
  const map = new Map<string, GroceryItem>()

  for (const dayIngredients of ingredientsByDay) {
    for (const ing of dayIngredients) {
      const key = `${ing.name.toLowerCase().trim()}|${ing.unit.toLowerCase()}`
      const existing = map.get(key)

      if (existing) {
        existing.totalAmount += ing.amount
      } else {
        map.set(key, {
          name: ing.name.trim(),
          totalAmount: ing.amount,
          unit: ing.unit,
          category: categorizeIngredient(ing.name),
        })
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    if (catDiff !== 0) return catDiff
    return a.name.localeCompare(b.name)
  })
}

export function groupByCategory(items: GroceryItem[]): Record<string, GroceryItem[]> {
  const groups: Record<string, GroceryItem[]> = {}
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  }
  return groups
}

export { CATEGORY_ORDER }
