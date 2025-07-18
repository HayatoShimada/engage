'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface User {
  id: string
  name: string | null
  email: string
  role: string | null
  organization?: {
    id: string
    name: string
  }
}

interface UserContextType {
  user: User | null
  isLoading: boolean
  error: Error | null
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  error: null,
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchUser() {
      if (status === 'authenticated' && session?.user?.email) {
        try {
          const response = await fetch(`/api/users?email=${session.user.email}`)
          if (!response.ok) {
            if (response.status === 404) {
              // ユーザーがデータベースに存在しない場合（外部ユーザーなど）
              console.log('User not found in database, but authenticated:', session.user.email)
              setUser(null)
              setError(null)
            } else {
              throw new Error('ユーザー情報の取得に失敗しました')
            }
          } else {
            const userData = await response.json()
            
            if (!userData.organization) {
              console.warn('Organization data is missing for user:', userData.email)
            }
            
            setUser(userData)
            setError(null)
          }
        } catch (err) {
          console.error('Error fetching user:', err)
          setError(err instanceof Error ? err : new Error('予期せぬエラーが発生しました'))
        } finally {
          setIsLoading(false)
        }
      } else if (status === 'unauthenticated') {
        setUser(null)
        setError(null)
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [session, status])

  return (
    <UserContext.Provider value={{ user, isLoading, error }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
} 