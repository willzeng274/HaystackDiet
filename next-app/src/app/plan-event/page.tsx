'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from '@/components/file-upload'
import { StatisticsDisplay } from '@/components/statistics-display'
import { MealSchedule } from '@/components/meal-schedule'
import AutoCompleteInput from '@/components/autocomplete'

export default function PlanEvent() {
  const [step, setStep] = useState(1)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [mealCount, setMealCount] = useState(3)
  const [dietaryData, setDietaryData] = useState<any>(null)
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null)

  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    // TODO: Process the CSV file and set dietaryData
    setStep(2)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 dark:from-purple-900 dark:via-pink-900 dark:to-red-900 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-white mb-8">Plan Your Event</h1>
        {step === 1 && (
          <Tabs defaultValue="csv" className="w-full max-w-3xl mx-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv">Upload CSV</TabsTrigger>
              <TabsTrigger value="manual">Continue from model</TabsTrigger>
            </TabsList>
            <TabsContent value="csv">
              <Card>
                <CardContent className="pt-6">
                  <Label htmlFor="mealCount" className="py-2 text-lg font-bold block">Amount of days for event</Label>
                  <Input
                    id="mealCount"
                    className="mb-4"
                    type="number"
                    value={mealCount}
                    onChange={(e) => setMealCount(parseInt(e.target.value))}
                    min={1}
                    max={10}
                  />
                  <AutoCompleteInput setCoordinates={setCoordinates} />
                  <FileUpload onUpload={handleFileUpload} dayCount={mealCount} setDietaryData={setDietaryData} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="manual">
              <Card>
                <CardContent className="pt-6">
                  
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        {step === 2 && dietaryData && (
          <Card className="w-full max-w-3xl mx-auto">
            <CardContent className="pt-6">
              <StatisticsDisplay data={dietaryData} />
              <Button onClick={() => setStep(3)} className="mt-4">Generate Meal Schedules</Button>
            </CardContent>
          </Card>
        )}
        {step === 3 && (
          <Card className="w-full max-w-3xl mx-auto">
            <CardContent className="pt-6">
              <MealSchedule mealCount={mealCount} dietaryData={dietaryData} />
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  )
}