'use client'

import { useState } from 'react'
import { migrateLocalStorageToPrisma, checkDataDifference } from '@/lib/migrateLocalStorageToPrisma'

export default function MigrateDataPage() {
  const [checking, setChecking] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [checkResult, setCheckResult] = useState<any>(null)
  const [migrateResult, setMigrateResult] = useState<any>(null)

  const handleCheck = async () => {
    setChecking(true)
    try {
      const result = await checkDataDifference()
      setCheckResult(result)
      console.log('✅ 检查完成:', result)
    } catch (error) {
      console.error('❌ 检查失败:', error)
      setCheckResult({ error: String(error) })
    } finally {
      setChecking(false)
    }
  }

  const handleMigrate = async () => {
    setMigrating(true)
    try {
      const result = await migrateLocalStorageToPrisma()
      setMigrateResult(result)
      console.log('✅ 迁移完成:', result)
    } catch (error) {
      console.error('❌ 迁移失败:', error)
      setMigrateResult({ error: String(error) })
    } finally {
      setMigrating(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">数据迁移工具</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">1. 检查数据差异</h2>
          <p className="text-gray-600 mb-4">
            检查localStorage和Prisma数据库中的数据差异
          </p>
          <button
            onClick={handleCheck}
            disabled={checking}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {checking ? '检查中...' : '检查数据'}
          </button>
          
          {checkResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">检查结果：</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(checkResult, null, 2)}
              </pre>
              
              {checkResult.needsMigration && (
                <div className="mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
                  <p className="font-semibold">⚠️ 需要迁移！</p>
                  <p className="text-sm">localStorage中有 {checkResult.localStorage.metadataNonEmptyFields} 个非空字段</p>
                  <p className="text-sm">Prisma中只有 {checkResult.prisma.metadataNonEmptyFields} 个非空字段</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">2. 迁移数据到Prisma</h2>
          <p className="text-gray-600 mb-4">
            将localStorage中的完整数据迁移到Prisma数据库
          </p>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {migrating ? '迁移中...' : '开始迁移'}
          </button>
          
          {migrateResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">迁移结果：</h3>
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(migrateResult, null, 2)}
              </pre>
              
              {migrateResult.success && (
                <div className="mt-4 p-3 bg-green-100 border-l-4 border-green-500 text-green-700">
                  <p className="font-semibold">✅ 迁移成功！</p>
                  <p className="text-sm">数据已从localStorage同步到Prisma数据库</p>
                </div>
              )}
              
              {migrateResult.error && (
                <div className="mt-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">
                  <p className="font-semibold">❌ 迁移失败</p>
                  <p className="text-sm">{migrateResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700">
          <p className="font-semibold">📌 使用说明：</p>
          <ol className="text-sm mt-2 space-y-1 list-decimal list-inside">
            <li>先点击"检查数据"查看localStorage和Prisma的数据差异</li>
            <li>如果显示"需要迁移"，点击"开始迁移"</li>
            <li>迁移完成后，刷新页面验证数据</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
























