"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShuffleLoader } from "./shuffle-loader";
import { useRouter } from "next/navigation";
import { Food, Restriction, useFoodStore } from "@/app/game/store";
import { useToast } from "@/hooks/use-toast";

const dietaryRestrictions = {
  GLUTEN: "Gluten-Free",
  HALAL: "Halal",
  VEGAN: "Vegan",
  VEGETARIAN: "Vegetarian",
  NUT: "Nut-Free",
  LACTOSE: "Lactose-Free",
};

const generateMealSchedule = async (dayCount: number, dietaryData: any) => {
  console.log("GENERATE MEAL SCHEDULE");

  const payload = {
    restrictions: dietaryData,
    days: dayCount,
    long: -81.274239, // Replace with actual longitude
    lat: 43.007451, // Replace with actual latitude
  };

  console.log(payload);

  const res = await fetch("http://localhost:8000/generate-meal", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      return data;
    })
    .catch((error) => {
      console.error("There was a problem with the fetch operation:", error);
    });

  // This is a placeholder function. In a real application, you'd have a more sophisticated
  // algorithm to generate meal schedules based on dietary restrictions and preferences.
  return res;
};

export function MealSchedule({
  mealCount,
  dietaryData
}: {
  mealCount: number;
  dietaryData: any;
}) {
  // The schedule is generated as giant json,

  // const [schedules, setSchedules] = useState(() => Array.from({ length: 1 }).map(() => generateMealSchedule(mealCount, dietaryData)));
  // Assign schedules to a usestate json
  const [schedules, setSchedules] = useState<any>(null);
  const router = useRouter()
  const { toast } = useToast()
  // const foods = useFoodStore(state => state.foods)
  const setFoods = useFoodStore(state => state.setFoods)
  const regenCurrFoods = useFoodStore(state => state.regenCurrFoods)

  const handleConfirm = () => {
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
      })
    });
    console.log(newFoods);
    setFoods(newFoods);
    regenCurrFoods();
    router.push('/game');
  }

  // use ref so the useEffect can be called only once

  const fetchRef = useRef(false);

  useEffect(() => {
    if (fetchRef.current) {
      return;
    }
    fetchRef.current = true;
    const fetchData = async () => {
      const result = await generateMealSchedule(mealCount, dietaryData);

      // Download the json to the user's computer
      const element = document.createElement("a");
      const file = new Blob([JSON.stringify(result)], {
        type: "application/json",
      });
      element.href = URL.createObjectURL(file);
      element.download = "meal_schedule.json";
      document.body.appendChild(element); // Required for this to work in FireFox
      element.click();


      setSchedules(result);
      console.log(result);
    };
    fetchData();
  }, []);

  /*

  each json for day has the following attributes:
  day (int)
  meals {
    breakfast {
    this is an array of meals that have the follinwg attributes: 
      dietary_restrictions 
      restaurant 
      item
      price
      people_count
      is_special_request
    }
    lunch {
    this is an array of meals that have the follinwg attributes: 
      dietary_restrictions 
      restaurant 
      item
      price
      people_count
      is_special_request
    }
    dinner {
    this is an array of meals that have the follinwg attributes: 
      dietary_restrictions 
      restaurant 
      item
      price
      people_count
      is_special_request
    }
  }

  */
  if (!schedules) {
    return (
      <div>
        <h1 className="text-center text-4xl text-bold mb-10 animate-pulse">Loading...</h1>
        <ShuffleLoader />
        <iframe className="aspect-video w-full mt-20" src="https://www.youtube.com/embed/eRXE8Aebp7s" title="10 hour loop playing Subway Surfers" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin"></iframe>
      </div>
    );
  } else {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center mb-4">
          Meal Schedule Options
        </h2>
        <ScrollArea>
          {schedules["meal_plans"].map((schedule, index) => (
            <Card key={index} className="mb-4">
              <CardHeader>
                <CardTitle>Day {index + 1}</CardTitle>
              </CardHeader>

              <CardContent>
                <h3 className="text-xl font-semibold">Breakfast</h3>
                {schedule.meals.breakfast.map((meal, mealIndex) => (
                  <div key={mealIndex} className="meal-item">
                    {meal.dietary_restriction} - {meal.item} - {meal.restaurant} - ${meal.price} - {meal.people_count} people
                  </div>
                ))}

                <h3 className="text-xl font-semibold">Lunch</h3>
                {schedule.meals.lunch.map((meal, mealIndex) => (
                  <div key={mealIndex} className="meal-item">
                    {meal.dietary_restriction} - {meal.item} - {meal.restaurant} - ${meal.price} - {meal.people_count} people
                  </div>
                ))}

                <h3 className="text-xl font-semibold">Dinner</h3>
                {schedule.meals.dinner.map((meal, mealIndex) => (
                  <div key={mealIndex} className="meal-item">
                    {meal.dietary_restriction} - {meal.item} - {meal.restaurant} - ${meal.price} - {meal.people_count} people
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </ScrollArea>
        <Button onClick={handleConfirm} className="mt-4 ml-auto mr-auto flex">Confirm and Start Game</Button>
      </div>
    );
  }
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
