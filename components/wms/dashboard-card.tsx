"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { motion } from "framer-motion"

interface DashboardCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  variation?: {
    value: number
    isPositive: boolean
  }
  description?: string
  className?: string
}

export function DashboardCard({
  title,
  value,
  icon: Icon,
  variation,
  description,
  className
}: DashboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`hover:shadow-lg transition-shadow rounded-2xl ${className || ""}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          {variation && (
            <div className={`flex items-center text-xs mt-1 ${
              variation.isPositive ? "text-green-600" : "text-red-600"
            }`}>
              {variation.isPositive ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {Math.abs(variation.value)}%
            </div>
          )}
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

