import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        
        return (
          <div key={item.href} className="flex items-center">
            {index === 0 && <Home className="h-4 w-4 mr-1" />}
            
            {isLast ? (
              <span className="text-foreground font-medium">{item.label}</span>
            ) : (
              <Link 
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
            
            {!isLast && (
              <ChevronRight className="h-4 w-4 mx-1" />
            )}
          </div>
        )
      })}
    </nav>
  )
}