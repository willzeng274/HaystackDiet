'use client'

import React, { useState } from 'react'
import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

interface StatisticsDisplayProps {
  data: Record<string, number>
}

export function StatisticsDisplay({ data }: StatisticsDisplayProps) {
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>(Object.keys(data))

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setSelectedRestrictions(prev =>
      checked ? [...prev, id] : prev.filter(item => item !== id)
    )
  }

  const filteredData = Object.entries(data).filter(([key]) => selectedRestrictions.includes(key))

  const pieChartData = {
    labels: filteredData.map(([key]) => key),
    datasets: [
      {
        data: filteredData.map(([, value]) => value),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#FF6384'
        ],
        hoverBackgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#FF6384'
        ]
      }
    ]
  }

  return (
    <div>
      <h2>Statistics Display</h2>
      <div>
        {Object.keys(data).map(key => (
          <div key={key}>
            <input
              type="checkbox"
              id={key}
              checked={selectedRestrictions.includes(key)}
              onChange={e => handleCheckboxChange(key, e.target.checked)}
            />
            <label htmlFor={key}>{key}</label>
          </div>
        ))}
      </div>
      <Pie data={pieChartData} />
    </div>
  )
}
