'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Search, Menu, User, LogOut, Settings, ShoppingBag } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAuthStore } from '@/store/auth-store'
import { useCartStore } from '@/store/cart-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CartDrawer } from '@/components/cart/cart-drawer'

export function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const { user, signOut, loading } = useAuthStore()
  const { cart } = useCartStore()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to search results
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary" />
            <span className="font-bold text-xl">PrintShop</span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for prints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4"
              />
            </form>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Search Button - Mobile */}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Search className="h-4 w-4" />
            </Button>

            {/* Cart */}
            <CartDrawer />

            {/* User Menu */}
            {!loading && (
              <>
                {user ? (
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <Button variant="ghost" size="icon">
                        <User className="h-4 w-4" />
                      </Button>
                    </DropdownMenu.Trigger>
                    
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className="min-w-[200px] bg-background border rounded-md shadow-md p-1"
                        sideOffset={5}
                      >
                        <div className="px-2 py-1.5 text-sm font-medium border-b mb-1">
                          {user.full_name || user.email}
                        </div>
                        
                        <DropdownMenu.Item asChild>
                          <Link 
                            href="/account" 
                            className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer"
                          >
                            <User className="h-4 w-4" />
                            My Account
                          </Link>
                        </DropdownMenu.Item>
                        
                        <DropdownMenu.Item asChild>
                          <Link 
                            href="/orders" 
                            className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer"
                          >
                            <ShoppingBag className="h-4 w-4" />
                            My Orders
                          </Link>
                        </DropdownMenu.Item>

                        {user.role === 'admin' && (
                          <DropdownMenu.Item asChild>
                            <Link 
                              href="/admin" 
                              className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer"
                            >
                              <Settings className="h-4 w-4" />
                              Admin Panel
                            </Link>
                          </DropdownMenu.Item>
                        )}
                        
                        <DropdownMenu.Separator className="h-px bg-border my-1" />
                        
                        <DropdownMenu.Item
                          onSelect={handleSignOut}
                          className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer text-destructive"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                ) : (
                  <Button asChild variant="outline">
                    <Link href="/auth">Sign In</Link>
                  </Button>
                )}
              </>
            )}

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden py-4 border-t">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for prints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
          </form>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="space-y-2">
              <Link 
                href="/products"
                className="block px-3 py-2 text-sm hover:bg-accent rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                All Products
              </Link>
              <Link 
                href="/categories"
                className="block px-3 py-2 text-sm hover:bg-accent rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Categories
              </Link>
              {user && (
                <>
                  <Link 
                    href="/account"
                    className="block px-3 py-2 text-sm hover:bg-accent rounded"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    My Account
                  </Link>
                  <Link 
                    href="/orders"
                    className="block px-3 py-2 text-sm hover:bg-accent rounded"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    My Orders
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}