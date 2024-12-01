'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, Check } from 'lucide-react'
import { UploadButtonJSON } from './json-button'
import { useToast } from '@/hooks/use-toast'
import { Food, Restriction, useFoodStore } from '@/app/game/store'
import { useRouter } from 'next/navigation'

export function JsonUpload() {
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadComplete, setUploadComplete] = useState(false)

    const handleFileChange = (files: File[]) => {
        if (files && files[0]) {
            setFile(files[0]);
            setUploadComplete(false);
        }
    }
    const { toast } = useToast();
    const router = useRouter();
    const setFoods = useFoodStore((state) => state.setFoods);
    const regenCurrFoods = useFoodStore((state) => state.regenCurrFoods);

    const handleUpload = () => {
        if (file) {
            setUploading(true)
            // get file data as json
            // get schedules as JSON parse
            //   const schedules = JSON.parse(file);
            const reader = new FileReader();
            reader.onload = function (event) {
                if (!event.target) {
                    return;
                }
                const schedules = JSON.parse(event.target.result as string);
                console.log("Schedules", schedules);
                if (!schedules) {
                    toast({
                        title: "Error",
                        description: "No schedules found",
                        variant: "destructive",
                    })
                    return;
                }
                const meal_plans = schedules["meal_plans"];
                console.log("Dietary Data", schedules, meal_plans);
                if (!meal_plans) {
                    toast({
                        title: "Error",
                        description: "No meal plans found",
                        variant: "destructive"
                    });
                    return;
                }
                // meal_plans is an array of n objects
                // object: day: number, meals: {breakfast: [], lunch: [], dinner: []}
                // each breakfast, lunch, dinner arrays contain objects with { dietary_restriction, item, restaurant, price, people_count, is_special_request }
                // map the meal_plans into foods

                const newFoods: {
                    [key in Restriction]: Food[]
                } = {
                    "NORMAL": [],
                    "VEGETARIAN": [],
                    "VEGAN": [],
                    "GLUTEN": [],
                    "LACTOSE": [],
                    "HALAL": [],
                    "NUT": [],
                }

                function convert(s: string): Restriction {
                    console.log(s);
                    if (s === "NONE") {
                        return "NORMAL";
                    } else if (s === "NO RESTRICTIONS") {
                        return "NORMAL";
                    }
                    return s as Restriction;
                }

                meal_plans.forEach((plan: any) => {
                    plan.meals.breakfast.forEach((meal: any) => {
                        newFoods[convert(meal.dietary_restriction)]?.push({
                            name: meal.item,
                            restriction: meal.dietary_restriction,
                        });
                    })
                    plan.meals.lunch.forEach((meal: any) => {
                        newFoods[convert(meal.dietary_restriction)]?.push({
                            name: meal.item,
                            restriction: meal.dietary_restriction,
                        });
                    })
                    plan.meals.dinner.forEach((meal: any) => {
                        newFoods[convert(meal.dietary_restriction)]?.push({
                            name: meal.item,
                            restriction: meal.dietary_restriction,
                        });
                    });
                });

                console.log(newFoods);

                // check if any list of newFoods is empty, if so then add a placeholder food
                Object.keys(newFoods).forEach((key: string) => {
                    if (newFoods[key as Restriction].length === 0) {
                        newFoods[key as Restriction].push({
                            name: key.toLowerCase().charAt(0).toUpperCase() + key.toLowerCase().slice(1),
                            restriction: key as Restriction,
                        });
                    }
                });

                setFoods(newFoods);
                regenCurrFoods();
                router.push('/game');
            }
            reader.readAsText(file);
        }
    }

    return (
        <div className="space-y-4 mt-4">
            <Label htmlFor="csvFile" className="text-lg font-semibold">Upload Previous Model JSON Output File</Label>
            <div className="flex flex-col items-center space-x-2">
                <UploadButtonJSON onChange={handleFileChange} />
                {/* <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" /> */}
                {file && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Button className="" onClick={handleUpload} disabled={uploading || uploadComplete}>
                            {uploading ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                >
                                    <Upload className="w-5 h-5" />
                                </motion.div>
                            ) : uploadComplete ? (
                                <Check className="w-5 h-5 text-green-500" />
                            ) : (
                                <Upload className="w-5 h-5" />
                            )}
                            <span className="ml-2">{uploading ? 'Uploading...' : uploadComplete ? 'Uploaded' : 'Upload'}</span>
                        </Button>
                    </motion.div>
                )}
            </div>
            {file && !uploading && !uploadComplete && (
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.5 }}
                    className="h-2 bg-violet-500 rounded-full"
                />
            )}
            {uploading && (
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2 }}
                    className="h-2 bg-violet-500 rounded-full"
                />
            )}
        </div>
    )
}