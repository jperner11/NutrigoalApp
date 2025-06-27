'use client'

import React, { useState } from 'react'
import { Target, User, Droplets, TrendingUp, Calendar, Settings, LogOut, Zap, Utensils } from 'lucide-react'
import Link from 'next/link'

// Mock data - in real app this would come from the database
const mockUserData = {
  name: 'John Doe',
  email: 'john@example.com',
  dailyCalories: 2200,
  dailyWater: 2800,
  protein: 165,
  carbs: 248,
  fat: 73,
  isPremium: false
}

const mockMealPlan = {
  breakfast: [
    { name: 'Greek Yogurt with Berries', calories: 180, protein: 15, carbs: 25, fat: 3 },
    { name: 'Whole Grain Toast', calories: 120, protein: 4, carbs: 22, fat: 2 }
  ],
  lunch: [
    { name: 'Chicken Salad Bowl', calories: 350, protein: 35, carbs: 15, fat: 18 },
    { name: 'Quinoa Side', calories: 160, protein: 6, carbs: 30, fat: 3 }
  ],
  dinner: [
    { name: 'Salmon with Vegetables', calories: 420, protein: 35, carbs: 12, fat: 25 },
    { name: 'Sweet Potato', calories: 140, protein: 3, carbs: 32, fat: 1 }
  ],
  snacks: [
    { name: 'Protein Smoothie', calories: 180, protein: 25, carbs: 12, fat: 4 },
    { name: 'Mixed Nuts', calories: 160, protein: 6, carbs: 6, fat: 14 }
  ]
}

export default function DashboardPage() {
  const [currentTab, setCurrentTab] = useState('today')
  const [consumedCalories] = useState(1450)
  const [consumedWater] = useState(1800)

  const calorieProgress = (consumedCalories / mockUserData.dailyCalories) * 100
  const waterProgress = (consumedWater / mockUserData.dailyWater) * 100

  const renderMealSection = (title: string, meals: string[], icon: React.ReactNode) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center space-x-3 mb-4">
        {icon}
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="space-y-3">
        {meals.map((meal, index) => (
          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">{meal}</h4>
            </div>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Track
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-2">
                <Target className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                NutriGoal
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {!mockUserData.isPremium && (
                <Link
                  href="/premium"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>Upgrade to Premium</span>
                </Link>
              )}
              
              <div className="flex items-center space-x-2">
                <div className="bg-gray-200 rounded-full p-2">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <span className="text-gray-700 font-medium">{mockUserData.name}</span>
              </div>
              
              <button className="text-gray-600 hover:text-gray-900">
                <Settings className="h-5 w-5" />
              </button>
              
              <button className="text-gray-600 hover:text-gray-900">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {mockUserData.name.split(' ')[0]}! &#128075;
          </h1>
          <p className="text-gray-600">
            Let&apos;s continue your nutrition journey. Here&apos;s your plan for today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 rounded-full p-3">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Today</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">{consumedCalories}</span>
                <span className="text-sm text-gray-500">/ {mockUserData.dailyCalories} cal</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(calorieProgress, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">Calories consumed</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-cyan-100 rounded-full p-3">
                <Droplets className="h-6 w-6 text-cyan-600" />
              </div>
              <span className="text-sm text-gray-500">Today</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">{consumedWater}ml</span>
                <span className="text-sm text-gray-500">/ {mockUserData.dailyWater}ml</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(waterProgress, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">Water intake</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">This week</span>
            </div>
            <div className="space-y-2">
              <span className="text-2xl font-bold text-gray-900">5/7</span>
              <p className="text-sm text-gray-600">Days on track</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 rounded-full p-3">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Streak</span>
            </div>
            <div className="space-y-2">
              <span className="text-2xl font-bold text-gray-900">12</span>
              <p className="text-sm text-gray-600">Days streak</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          {['today', 'week', 'progress'].map((tab) => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                currentTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content based on selected tab */}
        {currentTab === 'today' && (
          <div className="space-y-6">
            {/* Meal Plan */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Today&apos;s Meal Plan</h2>
                {!mockUserData.isPremium && (
                  <Link
                    href="/premium"
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    🔓 Unlock 7-day plans with Premium
                  </Link>
                )}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {renderMealSection('Breakfast', mockMealPlan.breakfast.map(meal => meal.name), 
                  <div className="bg-yellow-100 rounded-full p-2">
                    <Utensils className="h-4 w-4 text-yellow-600" />
                  </div>
                )}
                {renderMealSection('Lunch', mockMealPlan.lunch.map(meal => meal.name),
                  <div className="bg-orange-100 rounded-full p-2">
                    <Utensils className="h-4 w-4 text-orange-600" />
                  </div>
                )}
                {renderMealSection('Dinner', mockMealPlan.dinner.map(meal => meal.name),
                  <div className="bg-red-100 rounded-full p-2">
                    <Utensils className="h-4 w-4 text-red-600" />
                  </div>
                )}
                {renderMealSection('Snacks', mockMealPlan.snacks.map(meal => meal.name),
                  <div className="bg-green-100 rounded-full p-2">
                    <Utensils className="h-4 w-4 text-green-600" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentTab === 'week' && (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
            <div className="max-w-md mx-auto">
              <div className="bg-purple-100 rounded-full p-4 w-fit mx-auto mb-4">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                7-Day Meal Plans Available with Premium
              </h3>
              <p className="text-gray-600 mb-6">
                Get personalized meal plans for the entire week, including grocery lists and meal prep suggestions.
              </p>
              <Link
                href="/premium"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
              >
                <Zap className="h-5 w-5" />
                <span>Upgrade to Premium</span>
              </Link>
            </div>
          </div>
        )}

        {currentTab === 'progress' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Overview</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">92%</div>
                  <div className="text-sm text-gray-600">Avg. daily goal completion</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">15</div>
                  <div className="text-sm text-gray-600">Days this month</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">2.1kg</div>
                  <div className="text-sm text-gray-600">Progress toward goal</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 