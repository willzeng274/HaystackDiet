'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Utensils, GamepadIcon } from 'lucide-react'
import { Vortex } from '@/components/ui/vortex'

export default function Home() {

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Vortex
        className="flex items-center flex-col justify-center px-2 md:px-10 py-4 w-full h-full"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center"
        >
          <motion.h1 
            variants={itemVariants}
            className="text-6xl font-bold text-white mb-8 tracking-tight"
          >
            Dietary Adventure
          </motion.h1>
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-8"
          >
            <Card className="w-64 h-64 bg-white/10 backdrop-blur-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
              <CardContent className="flex flex-col items-center justify-center h-full">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="text-white mb-4"
                >
                  <Utensils size={48} />
                </motion.div>
                <h2 className="text-2xl font-semibold text-white mb-4">Plan Your Event</h2>
                <Button asChild variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
                  <Link href="/plan-event">Start Planning</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="w-64 h-64 bg-white/10 backdrop-blur-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
              <CardContent className="flex flex-col items-center justify-center h-full">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="text-white mb-4"
                >
                  <GamepadIcon size={48} />
                </motion.div>
                <h2 className="text-2xl font-semibold text-white mb-4">Sandbox Mode</h2>
                <Button asChild variant="secondary" className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white">
                  <Link href="/sandbox">Enter Sandbox</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </Vortex>
    </div>
  )
}

