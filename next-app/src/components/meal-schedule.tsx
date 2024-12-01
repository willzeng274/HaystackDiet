'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

const dietaryRestrictions = {
  GLUTEN: 'Gluten-Free',
  HALAL: 'Halal',
  VEGAN: 'Vegan',
  VEGETARIAN: 'Vegetarian',
  NUT: 'Nut-Free',
  LACTOSE: 'Lactose-Free'
}

const generateMealSchedule = (dayCount: number, dietaryData: any) => {

  console.log("GENERATE MEAL SCHEDULE"); 

  // Fetch the meals from the API 
  const meals = Array();
  const formData = new FormData();
  formData.append('days', dayCount);
  formData.append('dietaryData', JSON.stringify(dietaryData));
  fetch('http://localhost:8000/generate-meal', 
    {
      method: 'POST',
      body: formData
    }
  )
    .then(response => response.json())
    .then(data => {
      console.log(data);
      meals.push(data);
    });
  
  

  // This is a placeholder function. In a real application, you'd have a more sophisticated
  // algorithm to generate meal schedules based on dietary restrictions and preferences.
  return Array(dayCount).fill(null).map((_, index) => ({
    name: `Meal ${index + 1}`,
    description: 'A balanced meal suitable for all dietary restrictions',
    restrictions: Object.keys(dietaryData).filter(() => Math.random() > 0.5)
  }))
}

export function MealSchedule({ mealCount, dietaryData }: { mealCount: number, dietaryData: any }) {
  const [schedules, setSchedules] = useState(() => Array.from({ length: 3 }).map(() => generateMealSchedule(mealCount, dietaryData)));

  const handleRegenerate = () => {
    setSchedules(Array.from({ length: 3 }).map(() => generateMealSchedule(mealCount, dietaryData)));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center mb-4">Meal Schedule Options</h2>
      <Button onClick={handleRegenerate}>Regenerate Schedules</Button>
      <ScrollArea>
        {schedules.map((schedule, index) => (
          <Card key={index} className="mb-4">
            <CardHeader>
              <CardTitle>Schedule {index + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              {schedule.map((meal, mealIndex) => (
                <div key={mealIndex} className="mb-2">
                  <h3 className="font-semibold">{meal.name}</h3>
                  <p>{meal.description}</p>
                  <p>Restrictions: {meal.restrictions.map(restriction => dietaryRestrictions[restriction]).join(', ')}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </ScrollArea>
    </div>
  )
}

/*
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

const generateMealSchedule = (mealCount: number, dietaryData: any) => {
  // This is a placeholder function. In a real application, you'd have a more sophisticated
  // algorithm to generate meal schedules based on dietary restrictions and preferences.
  return Array(mealCount).fill(null).map((_, index) => ({
    name: `Meal ${index + 1}`,
    description: 'A balanced meal suitable for all dietary restrictions',
    restrictions: Object.keys(dietaryData).filter(() => Math.random() > 0.5)
  }))
}

export function MealSchedule({ mealCount, dietaryData }: { mealCount: number, dietaryData: any }) {
  const [schedules, setSchedules] = useState(() => [
    generateMealSchedule(mealCount, dietaryData),
    generateMealSchedule(mealCount, dietaryData),
    generateMealSchedule(mealCount, dietaryData),
  ])

  const handleRegenerate = () => {
    setSchedules([
      generateMealSchedule(mealCount, dietaryData),
      generateMealSchedule(mealCount, dietaryData),
      generateMealSchedule(mealCount, dietaryData),
    ])
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center mb-4">Meal Schedule Options</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {schedules.map((schedule, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>Option {index + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <ul className="space-y-4">
                  {schedule.map((meal, mealIndex) => (
                    <motion.li
                      key={mealIndex}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: mealIndex * 0.1 }}
                      className="bg-white/10 p-4 rounded-lg"
                    >
                      <h3 className="font-bold">{meal.name}</h3>
                      <p>{meal.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {meal.restrictions.map((restriction: string) => (
                          <span key={restriction} className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                            {restriction}
                          </span>
                        ))}
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button onClick={handleRegenerate} className="w-full">Regenerate Options</Button>
    </div>
  )
}
*/