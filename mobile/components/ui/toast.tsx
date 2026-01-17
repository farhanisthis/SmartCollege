import * as React from "react"
import { View, Text } from "react-native"

// Simplified Toast types for Mobile (replacing Radix UI)
export type ToastProps = {
  id?: string
  className?: string
  variant?: "default" | "destructive"
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export type ToastActionElement = React.ReactElement

export const Toast = ({ title, description, variant }: ToastProps) => {
  return (
    <View className={`p-4 rounded-lg mb-2 ${variant === 'destructive' ? 'bg-red-100' : 'bg-white'}`}>
      {title && <Text className="font-bold">{title}</Text>}
      {description && <Text className="text-sm text-gray-500">{description}</Text>}
    </View>
  )
}
