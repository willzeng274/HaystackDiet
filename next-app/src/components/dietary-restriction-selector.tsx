'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

const dietaryRestrictions = [
  { id: 'gluten', label: 'Gluten', icon: '🌾' },
  { id: 'lactose', label: 'Lactose', icon: '🥛' },
  { id: 'vegan', label: 'Vegan', icon: '🌱' },
  { id: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
  { id: 'halal', label: 'Halal', icon: '🕌' },
  { id: 'kosher', label: 'Kosher', icon: '✡️' },
  { id: 'nutFree', label: 'Nut Free', icon: '🥜' },
]

export function DietaryRestrictionSelector({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [selections, setSelections] = useState<Record<string, { required: boolean, importance: number }>>({})

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setSelections(prev => ({
      ...prev,
      [id]: { ...prev[id], required: checked }
    }))
  }

  const handleSliderChange = (id: string, value: number[]) => {
    setSelections(prev => ({
      ...prev,
      [id]: { ...prev[id], importance: value[0] }
    }))
  }

  const handleSubmit = () => {
    onSubmit(selections)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center mb-4">Select Dietary Restrictions</h2>
      {dietaryRestrictions.map(restriction => (
        <motion.div
          key={restriction.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center space-x-4 bg-white/10 p-4 rounded-lg"
        >
          <Checkbox
            id={restriction.id}
            checked={selections[restriction.id]?.required || false}
            onCheckedChange={(checked) => handleCheckboxChange(restriction.id, checked as boolean)}
          />
          <Label htmlFor={restriction.id} className="flex items-center space-x-2 text-lg">
            <span className="text-2xl">{restriction.icon}</span>
            <span>{restriction.label}</span>
          </Label>
          {selections[restriction.id]?.required && (
            <div className="flex-1">
              <Slider
                defaultValue={[5]}
                max={10}
                step={1}
                onValueChange={(value) => handleSliderChange(restriction.id, value)}
              />
              <div className="text-xs text-center mt-1">Importance: {selections[restriction.id]?.importance || 5}</div>
            </div>
          )}
        </motion.div>
      ))}
      <Button onClick={handleSubmit} className="w-full">Submit</Button>
    </div>
  )
}

