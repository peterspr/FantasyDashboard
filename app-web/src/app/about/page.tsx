import Link from 'next/link'
import { Card } from '@/components/Card'

export default function About() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About Fantasy Insights</h1>
        
        <Card>
          <h2 className="text-xl font-semibold mb-4">Project Overview</h2>
          <p className="text-gray-600 mb-4">
            Fantasy Insights is a production-grade fantasy football platform that provides 
            data-driven insights and projections to help you make better fantasy decisions.
          </p>
          
          <h3 className="text-lg font-semibold mb-3">Technology Stack</h3>
          <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
            <li>Next.js + TypeScript + Tailwind CSS (Frontend)</li>
            <li>FastAPI + Python (Backend API)</li>
            <li>dbt + PostgreSQL (Data Warehouse)</li>
            <li>Prefect (Data Orchestration)</li>
            <li>Docker + Docker Compose (Development)</li>
          </ul>
          
          <h3 className="text-lg font-semibold mb-3">Current Status</h3>
          <p className="text-gray-600 mb-6">
            This is Stage 0 - Project Scaffold. The foundation is in place with 
            basic services, development environment, and CI/CD pipeline.
          </p>
          
          <Link 
            href="/" 
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </Link>
        </Card>
      </div>
    </div>
  )
}