"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const AccordionContext = React.createContext<{
    openItems: string[]
    toggleItem: (value: string) => void
    type: 'single' | 'multiple'
}>({
    openItems: [],
    toggleItem: () => { },
    type: 'single'
})

interface AccordionProps {
    type?: 'single' | 'multiple'
    defaultValue?: string | string[]
    className?: string
    children: React.ReactNode
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
    ({ type = 'single', defaultValue, className, children, ...props }, ref) => {
        const [openItems, setOpenItems] = React.useState<string[]>(() => {
            if (!defaultValue) return []
            return Array.isArray(defaultValue) ? defaultValue : [defaultValue]
        })

        const toggleItem = React.useCallback((value: string) => {
            setOpenItems(prev => {
                if (type === 'single') {
                    return prev.includes(value) ? [] : [value]
                }
                return prev.includes(value)
                    ? prev.filter(v => v !== value)
                    : [...prev, value]
            })
        }, [type])

        return (
            <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
                <div ref={ref} className={cn("space-y-1", className)} {...props}>
                    {children}
                </div>
            </AccordionContext.Provider>
        )
    }
)
Accordion.displayName = "Accordion"

const AccordionItemContext = React.createContext<{ value: string }>({ value: '' })

interface AccordionItemProps {
    value: string
    className?: string
    children: React.ReactNode
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
    ({ value, className, children, ...props }, ref) => {
        return (
            <AccordionItemContext.Provider value={{ value }}>
                <div ref={ref} className={cn("border-b", className)} {...props}>
                    {children}
                </div>
            </AccordionItemContext.Provider>
        )
    }
)
AccordionItem.displayName = "AccordionItem"

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    className?: string
    children: React.ReactNode
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
    ({ className, children, ...props }, ref) => {
        const { openItems, toggleItem } = React.useContext(AccordionContext)
        const { value } = React.useContext(AccordionItemContext)
        const isOpen = openItems.includes(value)

        return (
            <button
                ref={ref}
                type="button"
                onClick={() => toggleItem(value)}
                className={cn(
                    "flex flex-1 w-full items-center justify-between py-4 font-medium transition-all hover:underline",
                    "[&[data-state=open]>svg]:rotate-180",
                    className
                )}
                data-state={isOpen ? "open" : "closed"}
                {...props}
            >
                {children}
                <ChevronDown className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>
        )
    }
)
AccordionTrigger.displayName = "AccordionTrigger"

interface AccordionContentProps {
    className?: string
    children: React.ReactNode
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
    ({ className, children, ...props }, ref) => {
        const { openItems } = React.useContext(AccordionContext)
        const { value } = React.useContext(AccordionItemContext)
        const isOpen = openItems.includes(value)

        if (!isOpen) return null

        return (
            <div
                ref={ref}
                className={cn(
                    "overflow-hidden text-sm transition-all",
                    "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
                    className
                )}
                data-state={isOpen ? "open" : "closed"}
                {...props}
            >
                <div className="pb-4 pt-0">{children}</div>
            </div>
        )
    }
)
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
