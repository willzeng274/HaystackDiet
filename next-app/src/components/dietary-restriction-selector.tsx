'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { GiWheat, GiMilkCarton, GiPlantSeed, GiCarrot, GiPeanut } from 'react-icons/gi'
import { FaMosque } from 'react-icons/fa'

const dietaryRestrictions = [
  { id: 'gluten', label: 'Gluten', icon: GiWheat },
  { id: 'lactose', label: 'Lactose', icon: GiMilkCarton },
  { id: 'vegan', label: 'Vegan', icon: GiPlantSeed },
  { id: 'vegetarian', label: 'Vegetarian', icon: GiCarrot },
  { id: 'halal', label: 'Halal', icon: FaMosque },
  { id: 'nutFree', label: 'Nut Free', icon: GiPeanut },
]

export default function DietaryRestrictions({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([])

  const handleRestrictionToggle = (id: string) => {
    setSelectedRestrictions(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleSubmit = () => {
    console.log('Selected restrictions:', selectedRestrictions)
    onSubmit(selectedRestrictions)
    // Here you would typically send the data to your backend
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-center mb-8 text-pink-800">Choose dietary restrictions to train for</h1>
        <div className="space-y-6">
          {dietaryRestrictions.map(({ id, label, icon: Icon }) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="group"
            >
              <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-pink-50 to-orange-50 rounded-xl transition-all duration-300 group-hover:shadow-md">
                <Checkbox
                  id={id}
                  checked={selectedRestrictions.includes(id)}
                  onCheckedChange={() => handleRestrictionToggle(id)}
                  className="w-6 h-6 border-2 border-pink-400 text-pink-600 rounded-md focus:ring-pink-500 focus:ring-offset-2"
                />
                <Label
                  htmlFor={id}
                  className="flex items-center space-x-3 text-lg cursor-pointer group-hover:text-pink-700 transition-colors duration-200"
                >
                  <Icon className="text-2xl text-pink-500 group-hover:text-pink-600 transition-colors duration-200" />
                  <span>{label}</span>
                </Label>
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div
          className="mt-8"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white py-5 rounded-xl transition-all duration-300 text-lg font-semibold shadow-lg hover:shadow-xl"
          >
            Gamify
          </Button>
        </motion.div>
    </>
  )
}
